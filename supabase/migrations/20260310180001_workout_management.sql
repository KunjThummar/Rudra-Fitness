-- ============================================================
-- MIGRATION: Workout Management System
-- ============================================================

-- Exercise categories for filtering
CREATE TABLE public.exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.exercise_categories (name, description) VALUES
  ('Chest', 'Chest pressing and fly movements'),
  ('Back', 'Rows, pull-ups, and lat movements'),
  ('Shoulders', 'Shoulder press and lateral raises'),
  ('Arms', 'Biceps and triceps exercises'),
  ('Legs', 'Squats, lunges, leg press'),
  ('Core', 'Ab and core stability work'),
  ('Cardio', 'Aerobic conditioning exercises'),
  ('Full Body', 'Compound movements'),
  ('Flexibility', 'Stretching and mobility');

ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view categories" ON public.exercise_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.exercise_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Exercise library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT DEFAULT 'none',
  instructions TEXT DEFAULT '',
  demo_url TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active exercises" ON public.exercises
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins and trainers can manage exercises" ON public.exercises
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Workout plans (templates)
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  goal TEXT DEFAULT 'general' CHECK (goal IN ('weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general')),
  duration_weeks INTEGER DEFAULT 4,
  days_per_week INTEGER DEFAULT 3,
  estimated_duration_minutes INTEGER DEFAULT 60,
  is_template BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active workout plans" ON public.workout_plans
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins and trainers can manage workout plans" ON public.workout_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER set_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Exercises within each workout plan
CREATE TABLE public.workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',        -- can be "10", "8-12", "AMRAP"
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view plan exercises" ON public.workout_plan_exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and trainers can manage plan exercises" ON public.workout_plan_exercises
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Member workout assignments
CREATE TABLE public.member_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and trainers can manage member workouts" ON public.member_workouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Members can view own workout assignments" ON public.member_workouts
  FOR SELECT TO authenticated USING (auth.uid() = member_id);

CREATE TRIGGER set_member_workouts_updated_at
  BEFORE UPDATE ON public.member_workouts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Workout session logs (each time member does a workout)
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT DEFAULT '',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own workout logs" ON public.workout_logs
  FOR ALL TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins and trainers can view all workout logs" ON public.workout_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Individual exercise sets within a session log
CREATE TABLE public.workout_log_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight_kg NUMERIC(6,2),
  duration_seconds INTEGER,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_log_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own log sets" ON public.workout_log_sets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_log_id AND wl.member_id = auth.uid()
  ));
CREATE POLICY "Admins and trainers can view log sets" ON public.workout_log_sets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Insert sample exercises
INSERT INTO public.exercises (name, description, difficulty, muscle_groups, equipment, instructions) VALUES
  ('Push Up', 'Classic bodyweight chest exercise', 'beginner', ARRAY['Chest','Triceps','Shoulders'], 'none', 'Start in plank position. Lower chest to floor, press back up.'),
  ('Pull Up', 'Upper body pulling movement', 'intermediate', ARRAY['Back','Biceps'], 'pull-up bar', 'Hang from bar, pull until chin above bar, lower controlled.'),
  ('Squat', 'Foundational lower body exercise', 'beginner', ARRAY['Quads','Glutes','Hamstrings'], 'none', 'Stand feet shoulder-width. Lower hips until thighs parallel to floor.'),
  ('Deadlift', 'Hip hinge compound movement', 'intermediate', ARRAY['Back','Glutes','Hamstrings'], 'barbell', 'Hinge at hips, grip bar, drive hips forward to stand.'),
  ('Plank', 'Core stability exercise', 'beginner', ARRAY['Core'], 'none', 'Hold prone position on forearms and toes. Keep body straight.'),
  ('Dumbbell Curl', 'Bicep isolation exercise', 'beginner', ARRAY['Biceps'], 'dumbbells', 'Curl dumbbells to shoulders, lower controlled.'),
  ('Bench Press', 'Horizontal chest press with barbell', 'intermediate', ARRAY['Chest','Triceps','Shoulders'], 'barbell,bench', 'Lie on bench, press bar from chest to lockout.'),
  ('Lunges', 'Unilateral leg exercise', 'beginner', ARRAY['Quads','Glutes'], 'none', 'Step forward, lower back knee near floor, push back up.'),
  ('Mountain Climbers', 'Dynamic core and cardio exercise', 'intermediate', ARRAY['Core','Cardio'], 'none', 'In plank, drive knees to chest alternately at fast pace.'),
  ('Burpee', 'Full body conditioning exercise', 'advanced', ARRAY['Full Body','Cardio'], 'none', 'Drop to push-up, stand, jump. Repeat continuously.');
