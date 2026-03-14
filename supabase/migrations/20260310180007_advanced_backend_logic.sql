-- ============================================================
-- MIGRATION: Advanced Backend Logic (Achievements & Capacity)
-- ============================================================

-- Function to evaluate and award achievements based on criteria
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_member_id UUID,
  p_criteria_type TEXT,
  p_current_value NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_already_awarded BOOLEAN;
BEGIN
  -- Loop through all active achievements matching the criteria type
  FOR v_achievement IN
    SELECT id, criteria_value
    FROM public.achievements
    WHERE is_active = true
      AND criteria_type = p_criteria_type
      AND criteria_value <= p_current_value
  LOOP
    -- Check if member already has this achievement
    SELECT EXISTS (
      SELECT 1 FROM public.member_achievements
      WHERE member_id = p_member_id AND achievement_id = v_achievement.id
    ) INTO v_already_awarded;

    IF NOT v_already_awarded THEN
      -- Award the achievement
      INSERT INTO public.member_achievements (member_id, achievement_id, notes)
      VALUES (p_member_id, v_achievement.id, 'Auto-awarded for ' || p_criteria_type || ' reaching ' || p_current_value);
    END IF;
  END LOOP;
END;
$$;

-- Trigger for attendance streaks
CREATE OR REPLACE FUNCTION public.trigger_check_attendance_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_streak > OLD.current_streak OR OLD IS NULL THEN
    PERFORM public.check_and_award_achievements(NEW.member_id, 'attendance_streak', NEW.current_streak);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_attendance_streak_update
  AFTER INSERT OR UPDATE ON public.attendance_streaks
  FOR EACH ROW EXECUTE FUNCTION trigger_check_attendance_achievements();

-- Trigger for workouts count
CREATE OR REPLACE FUNCTION public.trigger_check_workout_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout_count INTEGER;
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
    -- Count total completed workouts
    SELECT COUNT(*) INTO v_workout_count
    FROM public.workout_logs
    WHERE member_id = NEW.member_id AND completed_at IS NOT NULL;

    PERFORM public.check_and_award_achievements(NEW.member_id, 'workouts_count', v_workout_count);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_workout_log_complete
  AFTER INSERT OR UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_check_workout_achievements();


-- Capacity Management Integration in Attendance Check-in/out
CREATE OR REPLACE FUNCTION public.update_gym_capacity_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
BEGIN
  -- Get the first (or only) capacity record
  SELECT id INTO v_gym_id FROM public.gym_capacity LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    -- Check-in (assuming manual or qr insert always starts as check-in)
    UPDATE public.gym_capacity
    SET current_occupancy = current_occupancy + 1
    WHERE id = v_gym_id AND current_occupancy < max_capacity;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check-out happened
    IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL THEN
      UPDATE public.gym_capacity
      SET current_occupancy = GREATEST(current_occupancy - 1, 0)
      WHERE id = v_gym_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER after_attendance_capacity_update
  AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_gym_capacity_on_attendance();
