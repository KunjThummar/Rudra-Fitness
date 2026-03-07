import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Calendar, TrendingUp, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function MemberDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["member-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [
        { count: workoutsCount },
        { count: attendanceCount },
        { data: upcomingPayment },
      ] = await Promise.all([
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("payments").select("*").eq("user_id", user.id).eq("status", "pending").order("due_date", { ascending: true }).limit(1).single(),
      ]);

      return {
        workoutsCount: workoutsCount || 0,
        attendanceCount: attendanceCount || 0,
        upcomingPayment: upcomingPayment || null,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner text="Loading dashboard data..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Dashboard" subtitle="Overview of your fitness journey" />
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          title="Workouts Done"
          value={stats?.workoutsCount || 0}
          change="Total check-ins"
          changeType="neutral"
          icon={Dumbbell}
        />
        <StatCard
          title="Attendance"
          value={stats?.attendanceCount || 0}
          change="Days visited"
          changeType="positive"
          icon={Calendar}
        />
        <StatCard
          title="Progress"
          value={`${Math.min(((stats?.workoutsCount || 0) / 30) * 100, 100).toFixed(0)}%`}
          change="Of 30-day goal"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Next Payment"
          value={stats?.upcomingPayment ? format(new Date(stats.upcomingPayment.due_date), "dd MMM") : "No Dues"}
          change={stats?.upcomingPayment ? `₹${stats.upcomingPayment.amount} due` : "All paid"}
          changeType={stats?.upcomingPayment ? "negative" : "positive"}
          icon={CreditCard}
        />
      </div>
    </div>
  );
}
