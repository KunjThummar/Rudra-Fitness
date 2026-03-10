-- ============================================================
-- MIGRATION: Enhanced Attendance + QR Code System
-- ============================================================

-- Add QR-related columns to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'manual' CHECK (method IN ('manual', 'qr', 'admin')),
  ADD COLUMN IF NOT EXISTS qr_token TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Admins can insert/update attendance for anyone
CREATE POLICY "Members can insert own attendance" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- QR Codes table (one active QR per member at a time)
CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own QR codes" ON public.qr_codes
  FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins can manage QR codes" ON public.qr_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can create own QR codes" ON public.qr_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = member_id);

-- Function to generate or refresh member QR token
CREATE OR REPLACE FUNCTION public.generate_member_qr(p_member_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Deactivate all existing QR codes for member
  UPDATE public.qr_codes SET is_active = false WHERE member_id = p_member_id;

  -- Create new QR code
  INSERT INTO public.qr_codes (member_id, expires_at)
  VALUES (p_member_id, now() + INTERVAL '7 days')
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- Function to validate QR token and record attendance  
CREATE OR REPLACE FUNCTION public.check_in_via_qr(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr RECORD;
  v_already_checked_in BOOLEAN;
  v_attendance_id UUID;
BEGIN
  -- Find active QR code
  SELECT * INTO v_qr FROM public.qr_codes
  WHERE token = p_token AND is_active = true AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired QR code');
  END IF;

  -- Check if already checked in today (no checkout)
  SELECT EXISTS (
    SELECT 1 FROM public.attendance
    WHERE user_id = v_qr.member_id
      AND check_in >= CURRENT_DATE
      AND check_out IS NULL
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    -- Handle as check-out
    UPDATE public.attendance
    SET check_out = now()
    WHERE user_id = v_qr.member_id AND check_in >= CURRENT_DATE AND check_out IS NULL;

    UPDATE public.qr_codes SET last_used_at = now() WHERE id = v_qr.id;
    RETURN jsonb_build_object('success', true, 'action', 'check_out', 'member_id', v_qr.member_id);
  ELSE
    -- New check-in
    INSERT INTO public.attendance (user_id, method, qr_token)
    VALUES (v_qr.member_id, 'qr', p_token)
    RETURNING id INTO v_attendance_id;

    UPDATE public.qr_codes SET last_used_at = now() WHERE id = v_qr.id;
    RETURN jsonb_build_object('success', true, 'action', 'check_in', 'member_id', v_qr.member_id, 'attendance_id', v_attendance_id);
  END IF;
END;
$$;

-- Attendance streaks (calculated and cached)
CREATE TABLE public.attendance_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  last_visit_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own streaks" ON public.attendance_streaks
  FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins can view all streaks" ON public.attendance_streaks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can manage streaks" ON public.attendance_streaks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to update attendance streak after check-in
CREATE OR REPLACE FUNCTION public.update_attendance_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak RECORD;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Get existing streak record
  SELECT * INTO v_streak FROM public.attendance_streaks WHERE member_id = NEW.user_id;

  IF NOT FOUND THEN
    -- First ever visit
    INSERT INTO public.attendance_streaks (member_id, current_streak, longest_streak, total_visits, last_visit_date)
    VALUES (NEW.user_id, 1, 1, 1, CURRENT_DATE);
  ELSE
    IF v_streak.last_visit_date = CURRENT_DATE THEN
      -- Already visited today, just update total
      UPDATE public.attendance_streaks
      SET total_visits = v_streak.total_visits + 1, updated_at = now()
      WHERE member_id = NEW.user_id;
    ELSIF v_streak.last_visit_date = v_yesterday THEN
      -- Consecutive day - extend streak
      UPDATE public.attendance_streaks
      SET current_streak = v_streak.current_streak + 1,
          longest_streak = GREATEST(v_streak.longest_streak, v_streak.current_streak + 1),
          total_visits = v_streak.total_visits + 1,
          last_visit_date = CURRENT_DATE,
          updated_at = now()
      WHERE member_id = NEW.user_id;
    ELSE
      -- Streak broken - reset
      UPDATE public.attendance_streaks
      SET current_streak = 1,
          total_visits = v_streak.total_visits + 1,
          last_visit_date = CURRENT_DATE,
          updated_at = now()
      WHERE member_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER after_attendance_insert
  AFTER INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_attendance_streak();

-- Gym capacity settings
CREATE TABLE public.gym_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_capacity INTEGER NOT NULL DEFAULT 50,
  current_occupancy INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  opening_time TIME DEFAULT '06:00',
  closing_time TIME DEFAULT '22:00',
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view gym capacity" ON public.gym_capacity
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage gym capacity" ON public.gym_capacity
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default capacity record
INSERT INTO public.gym_capacity (max_capacity, is_open) VALUES (50, true);
