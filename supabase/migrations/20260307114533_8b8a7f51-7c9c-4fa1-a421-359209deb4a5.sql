
-- Membership Plans
CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  duration_months integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plans" ON public.membership_plans
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active plans" ON public.membership_plans
  FOR SELECT TO authenticated USING (is_active = true);

CREATE TRIGGER set_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Memberships (linking members to plans)
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage memberships" ON public.memberships
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own memberships" ON public.memberships
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Membership status validation trigger
CREATE OR REPLACE FUNCTION public.validate_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'expired', 'suspended', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid membership status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_membership_status_trigger
  BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION validate_membership_status();

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES public.memberships(id),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  payment_date timestamptz,
  due_date date,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Payment status validation trigger
CREATE OR REPLACE FUNCTION public.validate_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('paid', 'pending', 'overdue', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payment_status_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION validate_payment_status();

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own attendance" ON public.attendance
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
