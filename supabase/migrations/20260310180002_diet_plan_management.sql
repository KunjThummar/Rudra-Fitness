-- ============================================================
-- MIGRATION: Diet Plan Management System
-- ============================================================

-- Meals / Recipe library
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'meal' CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  calories INTEGER DEFAULT 0,
  protein_g NUMERIC(6,2) DEFAULT 0,
  carbs_g NUMERIC(6,2) DEFAULT 0,
  fat_g NUMERIC(6,2) DEFAULT 0,
  fiber_g NUMERIC(6,2) DEFAULT 0,
  serving_size TEXT DEFAULT '1 serving',
  preparation_time_minutes INTEGER DEFAULT 0,
  instructions TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active meals" ON public.meals
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins and trainers can manage meals" ON public.meals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER set_meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Ingredients within each meal
CREATE TABLE public.meal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT DEFAULT '',
  calories INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view meal ingredients" ON public.meal_ingredients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and trainers can manage meal ingredients" ON public.meal_ingredients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Enhance existing diet_plans table with more columns
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT 'general' 
    CHECK (goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'endurance', 'general')),
  ADD COLUMN IF NOT EXISTS total_calories INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS protein_target_g NUMERIC(6,2) DEFAULT 150,
  ADD COLUMN IF NOT EXISTS carbs_target_g NUMERIC(6,2) DEFAULT 250,
  ADD COLUMN IF NOT EXISTS fat_target_g NUMERIC(6,2) DEFAULT 65,
  ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER set_diet_plans_updated_at
  BEFORE UPDATE ON public.diet_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Meals scheduled within each diet plan (by day + meal type)
CREATE TABLE public.diet_plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  meal_time TEXT NOT NULL DEFAULT 'breakfast' 
    CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  order_index INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_plan_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view diet plan meals" ON public.diet_plan_meals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and trainers can manage diet plan meals" ON public.diet_plan_meals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Member diet plan assignments
CREATE TABLE public.member_diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and trainers can manage member diet plans" ON public.member_diet_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Members can view own diet plan assignments" ON public.member_diet_plans
  FOR SELECT TO authenticated USING (auth.uid() = member_id);

CREATE TRIGGER set_member_diet_plans_updated_at
  BEFORE UPDATE ON public.member_diet_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Nutrition / food logs (member daily food tracking)
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meal_time TEXT DEFAULT 'breakfast'
    CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  food_name TEXT,           -- for custom food entries (no meal_id)
  calories INTEGER DEFAULT 0,
  protein_g NUMERIC(6,2) DEFAULT 0,
  carbs_g NUMERIC(6,2) DEFAULT 0,
  fat_g NUMERIC(6,2) DEFAULT 0,
  quantity NUMERIC(5,2) DEFAULT 1,
  unit TEXT DEFAULT 'serving',
  photo_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own nutrition logs" ON public.nutrition_logs
  FOR ALL TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Admins and trainers can view nutrition logs" ON public.nutrition_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

-- Insert sample meals
INSERT INTO public.meals (name, description, category, calories, protein_g, carbs_g, fat_g, serving_size) VALUES
  ('Oatmeal with Berries', 'Whole oats topped with mixed berries', 'breakfast', 320, 12, 58, 6, '1 bowl'),
  ('Grilled Chicken Breast', 'Lean protein source, grilled', 'lunch', 250, 45, 0, 5, '150g'),
  ('Brown Rice', 'Complex carbohydrate staple', 'lunch', 215, 5, 45, 2, '1 cup cooked'),
  ('Whey Protein Shake', 'Post-workout protein supplement', 'post_workout', 150, 30, 5, 2, '1 scoop in water'),
  ('Mixed Salad', 'Greens, vegetables, olive oil', 'lunch', 180, 4, 15, 12, '1 large bowl'),
  ('Boiled Eggs', 'Complete protein source', 'snack', 155, 13, 1, 11, '2 eggs'),
  ('Sweet Potato', 'Complex carbs with vitamins', 'dinner', 180, 4, 41, 0, '1 medium'),
  ('Greek Yogurt', 'High protein dairy snack', 'snack', 100, 17, 6, 0, '170g container'),
  ('Salmon fillet', 'Omega-3 rich protein', 'dinner', 280, 39, 0, 13, '150g'),
  ('Banana', 'Quick energy pre-workout', 'pre_workout', 105, 1, 27, 0, '1 medium');
