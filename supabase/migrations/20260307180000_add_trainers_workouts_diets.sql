-- Trainers extension table
CREATE TABLE public.trainer_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specializations TEXT[] DEFAULT '{}',
  bio TEXT DEFAULT '',
  experience_years INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trainer profiles" ON public.trainer_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers can view and update own profile" ON public.trainer_profiles
  FOR ALL TO authenticated USING (auth.uid() = id AND public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Everyone can view active trainers" ON public.trainer_profiles
  FOR SELECT TO authenticated USING (is_active = true);

-- Member to Trainer assignments
CREATE TABLE public.member_trainer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT DEFAULT '',
  UNIQUE(member_id, trainer_id, status)
);

ALTER TABLE public.member_trainer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments" ON public.member_trainer_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers can view own assignments" ON public.member_trainer_assignments
  FOR SELECT TO authenticated USING (auth.uid() = trainer_id);

CREATE POLICY "Members can view own assignments" ON public.member_trainer_assignments
  FOR SELECT TO authenticated USING (auth.uid() = member_id);

-- Workouts
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and Trainers can manage workouts" ON public.workouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Members can view workouts" ON public.workouts
  FOR SELECT TO authenticated;

-- Diet Plans
CREATE TABLE public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and Trainers can manage diet plans" ON public.diet_plans
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Members can view diet plans" ON public.diet_plans
  FOR SELECT TO authenticated;
