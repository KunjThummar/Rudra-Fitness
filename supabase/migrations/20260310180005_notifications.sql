-- ============================================================
-- MIGRATION: Real-time Notifications System
-- ============================================================

-- Main notifications inbox (per user)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'error', 'payment', 'workout', 'achievement', 'announcement')),
  action_url TEXT DEFAULT '',
  action_label TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications (mark read)" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable Realtime on notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Announcements (admin broadcasts)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general' 
    CHECK (type IN ('general', 'maintenance', 'promotion', 'event', 'emergency')),
  target_audience TEXT DEFAULT 'all'
    CHECK (target_audience IN ('all', 'members', 'trainers', 'admins')),
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active announcements" ON public.announcements
  FOR SELECT TO authenticated USING (is_active = true AND starts_at <= now());
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Track which users have read which announcements
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own announcement reads" ON public.announcement_reads
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Notification preferences (per user)
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  workout_reminders BOOLEAN DEFAULT true,
  achievement_alerts BOOLEAN DEFAULT true,
  announcement_alerts BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to send a notification to a user
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_action_url TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata, sender_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url, p_metadata, auth.uid())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to broadcast announcement to all users of a target audience
CREATE OR REPLACE FUNCTION public.broadcast_announcement(p_announcement_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_announcement RECORD;
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_announcement FROM public.announcements WHERE id = p_announcement_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_user IN
    SELECT ur.user_id FROM public.user_roles ur
    WHERE (v_announcement.target_audience = 'all')
       OR (v_announcement.target_audience = 'members' AND ur.role = 'member')
       OR (v_announcement.target_audience = 'trainers' AND ur.role = 'trainer')
       OR (v_announcement.target_audience = 'admins' AND ur.role = 'admin')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, action_url, sender_id)
    VALUES (
      v_user.user_id,
      v_announcement.title,
      v_announcement.content,
      'announcement',
      '',
      auth.uid()
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE user_id = p_user_id AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Auto-notify on payment due (trigger on payments)
CREATE OR REPLACE FUNCTION public.notify_payment_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    PERFORM public.send_notification(
      NEW.user_id,
      'Payment Due',
      'You have a pending payment of ₹' || NEW.amount::TEXT || '. Please pay to keep your membership active.',
      'payment',
      '/member/membership',
      jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_due_notification
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION notify_payment_due();

-- Auto-notify on achievement earned
CREATE OR REPLACE FUNCTION public.notify_achievement_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
BEGIN
  SELECT * INTO v_achievement FROM public.achievements WHERE id = NEW.achievement_id;
  IF FOUND THEN
    PERFORM public.send_notification(
      NEW.member_id,
      '🏆 Achievement Unlocked!',
      'You earned the "' || v_achievement.name || '" badge! ' || v_achievement.description,
      'achievement',
      '/member/achievements',
      jsonb_build_object('achievement_id', NEW.achievement_id, 'badge_icon', v_achievement.badge_icon)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER achievement_earned_notification
  AFTER INSERT ON public.member_achievements
  FOR EACH ROW EXECUTE FUNCTION notify_achievement_earned();
