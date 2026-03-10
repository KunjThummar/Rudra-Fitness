import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Activity, Users, DollarSign, TrendingUp, TrendingDown, Flame, Award } from "lucide-react";
import { format, subDays } from "date-fns";

function MetricCard({ title, value, sub, icon: Icon, trend }: {
  title: string; value: string | number; sub?: string; icon: any; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="hover:border-primary/30 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-success" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
        </div>
        <p className="text-2xl font-bold bg-gradient-to-r from-primary to-[#EA580C] bg-clip-text text-transparent">{value}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["gym-analytics-full"],
    queryFn: async () => {
      const result = await supabase.rpc("get_gym_analytics");
      return result.data as any;
    },
  });

  const { data: engagement } = useQuery({
    queryKey: ["member-engagement-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_engagement")
        .select("engagement_level")
        .limit(500);
      if (!data) return null;
      const counts = data.reduce<Record<string, number>>((acc, row) => {
        acc[row.engagement_level] = (acc[row.engagement_level] ?? 0) + 1;
        return acc;
      }, {});
      return counts;
    },
  });

  const { data: monthlyRevenue } = useQuery({
    queryKey: ["monthly-revenue-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_revenue")
        .select("*")
        .limit(6);
      return data ?? [];
    },
  });

  const { data: trainers } = useQuery({
    queryKey: ["trainer-performance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_performance")
        .select("*")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: topStreaks } = useQuery({
    queryKey: ["top-streaks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_streaks")
        .select("*, profiles(full_name)")
        .order("current_streak", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" text="Building reports..." /></div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Reports & Analytics" subtitle={`Period: ${format(subDays(new Date(), 30), "MMM d")} – ${format(new Date(), "MMM d, yyyy")}`} />

      {/* Key Metrics */}
      <div className="px-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Metrics (Last 30 Days)</h2>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard title="Total Members" value={analytics?.members?.total ?? "–"} icon={Users} trend="up" />
          <MetricCard title="Active Members" value={analytics?.members?.active_last_30d ?? "–"}
            sub={`${analytics?.members?.retention_rate ?? 0}% retention`} icon={Activity} trend="up" />
          <MetricCard title="Revenue Collected" value={`₹${(analytics?.revenue?.collected ?? 0).toLocaleString()}`}
            icon={DollarSign} trend="up" />
          <MetricCard title="Pending Revenue" value={`₹${(analytics?.revenue?.pending ?? 0).toLocaleString()}`}
            icon={DollarSign} trend="down" />
          <MetricCard title="Total Check-ins" value={analytics?.attendance?.total_checkins ?? "–"}
            sub={`~${analytics?.attendance?.avg_daily ?? 0}/day`} icon={Flame} />
          <MetricCard title="New Members" value={analytics?.members?.new_in_period ?? "–"}
            sub="Joined this period" icon={TrendingUp} trend="up" />
        </div>
      </div>

      {/* Expiring Memberships Warning */}
      {(analytics?.memberships?.expiring_soon ?? 0) > 0 && (
        <div className="px-4">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/15 flex items-center justify-center">
                <Activity className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {analytics?.memberships?.expiring_soon} memberships expiring this week
                </p>
                <p className="text-xs text-muted-foreground">Consider reaching out to retain these members.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engagement Breakdown */}
      {engagement && (
        <div className="px-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Member Engagement</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              {[
                { key: "active", label: "Active (visited last 7d)", color: "bg-success" },
                { key: "occasional", label: "Occasional (last 30d)", color: "bg-warning" },
                { key: "inactive", label: "Inactive (30d+ ago)", color: "bg-destructive" },
                { key: "never_visited", label: "Never Visited", color: "bg-muted-foreground" },
              ].map(({ key, label, color }) => {
                const count = engagement[key] ?? 0;
                const total = Object.values(engagement).reduce((s: any, v: any) => s + v, 0) as number;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground">{label}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Revenue */}
      {(monthlyRevenue ?? []).length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Revenue</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(monthlyRevenue ?? []).map((month: any) => (
                  <div key={month.month} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{format(new Date(month.month), "MMMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{month.payment_count} payments · {month.paying_members} members</p>
                    </div>
                    <p className="text-sm font-bold text-primary">₹{Number(month.total_revenue).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trainer Performance */}
      {(trainers ?? []).length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trainer Performance</h2>
          <div className="space-y-2">
            {(trainers ?? []).map((trainer: any) => (
              <Card key={trainer.trainer_id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {trainer.trainer_name?.charAt(0) ?? "T"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{trainer.trainer_name}</p>
                    <p className="text-xs text-muted-foreground">{trainer.experience_years}yr exp</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{trainer.assigned_members}</p>
                    <p className="text-[10px] text-muted-foreground">members</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{trainer.workout_plans_assigned}</p>
                    <p className="text-[10px] text-muted-foreground">plans</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Top Streaks */}
      {(topStreaks ?? []).length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔥 Streak Leaders</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(topStreaks ?? []).map((s: any, i: number) => (
                  <div key={s.member_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {s.profiles?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{s.profiles?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{s.total_visits} total visits</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">🔥 {s.current_streak}</p>
                      <p className="text-[10px] text-muted-foreground">day streak</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Busiest Day */}
      {analytics?.attendance?.busiest_day && (
        <div className="px-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Busiest Day of the Week</p>
                <p className="text-xl font-bold text-primary">{analytics.attendance.busiest_day}</p>
                <p className="text-xs text-muted-foreground">Based on last 90 days of attendance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
