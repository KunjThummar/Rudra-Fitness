-- ============================================================
-- MIGRATION: Advanced Analytics & Reporting Views
-- ============================================================

-- ── Member Engagement View ──────────────────────────────────
CREATE OR REPLACE VIEW public.member_engagement AS
SELECT
  p.id AS member_id,
  p.full_name,
  p.created_at AS joined_at,
  COALESCE(s.total_visits, 0) AS total_visits,
  COALESCE(s.current_streak, 0) AS current_streak,
  COALESCE(s.longest_streak, 0) AS longest_streak,
  s.last_visit_date,
  COUNT(DISTINCT wl.id) AS workout_sessions,
  COUNT(DISTINCT ma.achievement_id) AS achievements_earned,
  COUNT(DISTINCT mdp.id) AS active_diet_plans,
  m.status AS membership_status,
  m.end_date AS membership_end_date,
  CASE
    WHEN s.last_visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'active'
    WHEN s.last_visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'occasional'
    WHEN s.last_visit_date IS NOT NULL THEN 'inactive'
    ELSE 'never_visited'
  END AS engagement_level
FROM public.profiles p
LEFT JOIN public.attendance_streaks s ON s.member_id = p.id
LEFT JOIN public.workout_logs wl ON wl.member_id = p.id
LEFT JOIN public.member_achievements ma ON ma.member_id = p.id
LEFT JOIN public.member_diet_plans mdp ON mdp.member_id = p.id AND mdp.status = 'active'
LEFT JOIN LATERAL (
  SELECT status, end_date FROM public.memberships
  WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1
) m ON true
GROUP BY p.id, p.full_name, p.created_at, s.total_visits, s.current_streak,
         s.longest_streak, s.last_visit_date, m.status, m.end_date;

-- ── Monthly Revenue View ────────────────────────────────────
CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  DATE_TRUNC('month', payment_date) AS month,
  COUNT(*) AS payment_count,
  SUM(amount) AS total_revenue,
  COUNT(DISTINCT user_id) AS paying_members,
  AVG(amount) AS avg_payment
FROM public.payments
WHERE status = 'paid' AND payment_date IS NOT NULL
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month DESC;

-- ── Daily Attendance Summary View ───────────────────────────
CREATE OR REPLACE VIEW public.daily_attendance_summary AS
SELECT
  DATE(check_in) AS date,
  COUNT(*) AS total_checkins,
  COUNT(DISTINCT user_id) AS unique_members,
  COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) AS with_checkout,
  AVG(EXTRACT(EPOCH FROM (check_out - check_in))/60)::INTEGER AS avg_duration_minutes
FROM public.attendance
GROUP BY DATE(check_in)
ORDER BY date DESC;

-- ── Gym Analytics Summary Function ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_gym_analytics(
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_members INTEGER;
  v_active_members INTEGER;
  v_new_members INTEGER;
  v_total_revenue NUMERIC;
  v_pending_revenue NUMERIC;
  v_total_checkins INTEGER;
  v_avg_daily_checkins NUMERIC;
  v_active_memberships INTEGER;
  v_expiring_soon INTEGER;
  v_top_day TEXT;
BEGIN
  -- Total members
  SELECT COUNT(*) INTO v_total_members FROM public.profiles;

  -- Active members (visited in last 30 days)
  SELECT COUNT(DISTINCT user_id) INTO v_active_members
  FROM public.attendance
  WHERE check_in >= CURRENT_DATE - INTERVAL '30 days';

  -- New members in range
  SELECT COUNT(*) INTO v_new_members
  FROM public.profiles
  WHERE created_at >= p_start_date AND created_at <= p_end_date + INTERVAL '1 day';

  -- Revenue in range
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM public.payments
  WHERE status = 'paid' AND payment_date >= p_start_date AND payment_date <= p_end_date;

  -- Pending revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_revenue
  FROM public.payments WHERE status IN ('pending', 'overdue');

  -- Attendance in range
  SELECT COUNT(*) INTO v_total_checkins
  FROM public.attendance
  WHERE check_in >= p_start_date AND check_in <= p_end_date + INTERVAL '1 day';

  -- Avg daily checkins in range
  v_avg_daily_checkins := ROUND(v_total_checkins::NUMERIC / GREATEST((p_end_date - p_start_date), 1), 1);

  -- Active memberships
  SELECT COUNT(*) INTO v_active_memberships
  FROM public.memberships WHERE status = 'active';

  -- Expiring in next 7 days
  SELECT COUNT(*) INTO v_expiring_soon
  FROM public.memberships
  WHERE status = 'active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

  -- Top day of the week by attendance
  SELECT TO_CHAR(check_in, 'Day') INTO v_top_day
  FROM public.attendance
  WHERE check_in >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY TO_CHAR(check_in, 'Day')
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
    'members', jsonb_build_object(
      'total', v_total_members,
      'active_last_30d', v_active_members,
      'new_in_period', v_new_members,
      'retention_rate', ROUND(v_active_members::NUMERIC / GREATEST(v_total_members, 1) * 100, 1)
    ),
    'revenue', jsonb_build_object(
      'collected', v_total_revenue,
      'pending', v_pending_revenue,
      'total_outstanding', v_pending_revenue
    ),
    'attendance', jsonb_build_object(
      'total_checkins', v_total_checkins,
      'avg_daily', v_avg_daily_checkins,
      'busiest_day', TRIM(COALESCE(v_top_day, 'N/A'))
    ),
    'memberships', jsonb_build_object(
      'active', v_active_memberships,
      'expiring_soon', v_expiring_soon
    )
  );

  RETURN v_result;
END;
$$;

-- ── Trainer Performance View ─────────────────────────────────
CREATE OR REPLACE VIEW public.trainer_performance AS
SELECT
  tp.id AS trainer_id,
  p.full_name AS trainer_name,
  COUNT(DISTINCT mta.member_id) AS assigned_members,
  COUNT(DISTINCT mw.id) AS workout_plans_assigned,
  COUNT(DISTINCT mdp.id) AS diet_plans_assigned,
  tp.experience_years,
  tp.specializations,
  tp.is_active
FROM public.trainer_profiles tp
JOIN public.profiles p ON p.id = tp.id
LEFT JOIN public.member_trainer_assignments mta ON mta.trainer_id = tp.id AND mta.status = 'active'
LEFT JOIN public.member_workouts mw ON mw.assigned_by = tp.id
LEFT JOIN public.member_diet_plans mdp ON mdp.assigned_by = tp.id
GROUP BY tp.id, p.full_name, tp.experience_years, tp.specializations, tp.is_active;

-- ── Member Progress Summary Function ────────────────────────
CREATE OR REPLACE FUNCTION public.get_member_progress_summary(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_measurement RECORD;
  v_first_measurement RECORD;
  v_workout_count INTEGER;
  v_streak RECORD;
  v_active_goals INTEGER;
  v_achieved_goals INTEGER;
  v_achievements_count INTEGER;
BEGIN
  SELECT * INTO v_latest_measurement FROM public.body_measurements
  WHERE member_id = p_member_id ORDER BY measured_at DESC LIMIT 1;

  SELECT * INTO v_first_measurement FROM public.body_measurements
  WHERE member_id = p_member_id ORDER BY measured_at ASC LIMIT 1;

  SELECT COUNT(*) INTO v_workout_count FROM public.workout_logs
  WHERE member_id = p_member_id AND completed_at IS NOT NULL;

  SELECT * INTO v_streak FROM public.attendance_streaks WHERE member_id = p_member_id;

  SELECT COUNT(*) INTO v_active_goals FROM public.fitness_goals
  WHERE member_id = p_member_id AND status = 'active';

  SELECT COUNT(*) INTO v_achieved_goals FROM public.fitness_goals
  WHERE member_id = p_member_id AND status = 'achieved';

  SELECT COUNT(*) INTO v_achievements_count FROM public.member_achievements
  WHERE member_id = p_member_id;

  RETURN jsonb_build_object(
    'body', jsonb_build_object(
      'latest_weight', v_latest_measurement.weight_kg,
      'latest_bmi', v_latest_measurement.bmi,
      'latest_body_fat', v_latest_measurement.body_fat_percentage,
      'weight_change', CASE
        WHEN v_first_measurement.weight_kg IS NOT NULL AND v_latest_measurement.weight_kg IS NOT NULL
        THEN ROUND((v_latest_measurement.weight_kg - v_first_measurement.weight_kg)::NUMERIC, 2)
        ELSE NULL
      END
    ),
    'fitness', jsonb_build_object(
      'total_workouts', v_workout_count,
      'current_streak', COALESCE(v_streak.current_streak, 0),
      'longest_streak', COALESCE(v_streak.longest_streak, 0),
      'total_visits', COALESCE(v_streak.total_visits, 0)
    ),
    'goals', jsonb_build_object(
      'active', v_active_goals,
      'achieved', v_achieved_goals
    ),
    'achievements', v_achievements_count
  );
END;
$$;

-- Enable RLS bypass for views using security_invoker
ALTER VIEW public.member_engagement SET (security_invoker = true);
ALTER VIEW public.monthly_revenue SET (security_invoker = true);
ALTER VIEW public.daily_attendance_summary SET (security_invoker = true);
ALTER VIEW public.trainer_performance SET (security_invoker = true);
