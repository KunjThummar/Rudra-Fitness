-- ============================================================
-- MIGRATION: Progress Tracking System
-- ============================================================

-- Body measurements (physical progress log)
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(6,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(5,2),
  body_fat_percentage NUMERIC(5,2),
  muscle_mass_kg NUMERIC(6,2),
  chest_cm NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  hips_cm NUMERIC(5,2),
  left_arm_cm NUMERIC(5,2),
  right_arm_cm NUMERIC(5,2),
  left_thigh_cm NUMERIC(5,2),
  right_thigh_cm NUMERIC(5,2),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins and trainers can view member measurements" ON public.body_measurements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Progress photos (references to Supabase Storage)
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  view_angle TEXT DEFAULT 'front' CHECK (view_angle IN ('front', 'back', 'side_left', 'side_right')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own progress photos" ON public.progress_photos
  FOR ALL TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins and trainers can view progress photos" ON public.progress_photos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Fitness goals
CREATE TABLE public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  goal_type TEXT NOT NULL DEFAULT 'weight' 
    CHECK (goal_type IN ('weight', 'strength', 'cardio', 'measurements', 'habit', 'custom')),
  target_value NUMERIC(10,2),
  current_value NUMERIC(10,2) DEFAULT 0,
  unit TEXT DEFAULT '',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'achieved', 'paused', 'abandoned')),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own fitness goals" ON public.fitness_goals
  FOR ALL TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins and trainers can view fitness goals" ON public.fitness_goals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER set_fitness_goals_updated_at
  BEFORE UPDATE ON public.fitness_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Achievements / Badge definitions
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  badge_icon TEXT DEFAULT '🏆',
  badge_color TEXT DEFAULT '#F97316',
  category TEXT DEFAULT 'general' 
    CHECK (category IN ('attendance', 'workout', 'diet', 'progress', 'milestone', 'general')),
  criteria_type TEXT DEFAULT 'manual'
    CHECK (criteria_type IN ('attendance_streak', 'workouts_count', 'weight_lost', 'membership_duration', 'manual')),
  criteria_value INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active achievements" ON public.achievements
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Member earned achievements
CREATE TABLE public.member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  UNIQUE(member_id, achievement_id)
);

ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own achievements" ON public.member_achievements
  FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins can manage member achievements" ON public.member_achievements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-calculate BMI
CREATE OR REPLACE FUNCTION public.calculate_bmi()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_calculate_bmi
  BEFORE INSERT OR UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE FUNCTION calculate_bmi();

-- Seed default achievements
INSERT INTO public.achievements (name, description, badge_icon, category, criteria_type, criteria_value) VALUES
  ('First Step', 'Logged your first workout session', '👟', 'workout', 'workouts_count', 1),
  ('Week Warrior', 'Attended the gym 7 days in a row', '🔥', 'attendance', 'attendance_streak', 7),
  ('Iron Will', 'Completed 30 workout sessions', '💪', 'workout', 'workouts_count', 30),
  ('Consistency King', '30-day attendance streak', '👑', 'attendance', 'attendance_streak', 30),
  ('Century Club', 'Completed 100 workout sessions', '💯', 'workout', 'workouts_count', 100),
  ('Weight Warrior', 'Lost first 5kg', '⚖️', 'progress', 'weight_lost', 5),
  ('3-Month Member', 'Active member for 3 months', '🥉', 'milestone', 'membership_duration', 90),
  ('6-Month Member', 'Active member for 6 months', '🥈', 'milestone', 'membership_duration', 180),
  ('Annual Champion', 'Active member for 1 year', '🥇', 'milestone', 'membership_duration', 365),
  ('Nutrition Nerd', 'Logged meals for 7 consecutive days', '🥗', 'diet', 'manual', 0);
