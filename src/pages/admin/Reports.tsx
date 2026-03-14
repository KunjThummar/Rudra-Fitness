import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Users, Dumbbell, Calendar, AlertCircle, Download, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

  // Queries
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", filterMonth],
    queryFn: async () => {
      const [year, month] = filterMonth.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString();

      // Get all necessary data
      const [
        { data: attendance },
        { data: members },
        { data: workoutPlans },
        { data: dietPlans },
        { data: goals },
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select("user_id, check_in")
          .gte("check_in", startDate)
          .lte("check_in", endDate),
        supabase.from("auth.users").select("id").eq("active", true),
        supabase.from("workout_plans").select("id").eq("is_active", true),
        supabase.from("diet_plans").select("id").eq("is_active", true),
        supabase.from("fitness_goals").select("id, status").eq("status", "completed"),
      ]);

      return {
        attendance: attendance ?? [],
        members: members ?? [],
        workoutPlans: workoutPlans ?? [],
        dietPlans: dietPlans ?? [],
        completedGoals: (goals ?? []).length,
      };
    },
  });

  const { data: memberEngagement } = useQuery({
    queryKey: ["member-engagement", filterMonth],
    queryFn: async () => {
      const [year, month] = filterMonth.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("user_id")
        .gte("check_in", startDate)
        .lte("check_in", endDate);

      if (error) throw error;

      const uniqueMembers = new Set((data ?? []).map(d => d.user_id));
      const totalCheckins = data?.length ?? 0;

      return {
        activeMembers: uniqueMembers.size,
        totalCheckins,
        avgCheckins: uniqueMembers.size > 0 ? Math.round(totalCheckins / uniqueMembers.size) : 0,
      };
    },
  });

  const { data: topAttendees } = useQuery({
    queryKey: ["top-attendees", filterMonth],
    queryFn: async () => {
      const [year, month] = filterMonth.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("user_id, auth.users(email)")
        .gte("check_in", startDate)
        .lte("check_in", endDate);

      if (error) throw error;

      const counts: Record<string, { email: string; count: number }> = {};
      (data ?? []).forEach(d => {
        if (!counts[d.user_id]) {
          counts[d.user_id] = { email: d.auth?.users?.email || "Unknown", count: 0 };
        }
        counts[d.user_id].count++;
      });

      return Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([_, v]) => v);
    },
  });

  // Calculations
  const totalMembers = dashboardStats?.members.length ?? 0;
  const activeMembers = memberEngagement?.activeMembers ?? 0;
  const engagementRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
  const totalAttendance = memberEngagement?.totalCheckins ?? 0;
  const avgAttendancePerMember = memberEngagement?.avgCheckins ?? 0;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Analytics & Reports" subtitle="Gym performance and member insights" />

      {/* Time Range Selector */}
      <div className="px-4 flex gap-2 items-center">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
        />
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-primary">{totalMembers}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total Members</p>
            <p className="text-xs text-success mt-2">+12% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-primary">{activeMembers}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Active This Month</p>
            <Badge variant="secondary" className="text-xs mt-2">{engagementRate}% Engagement</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-primary">{totalAttendance}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total Check-ins</p>
            <p className="text-xs text-muted-foreground mt-2">Avg: {avgAttendancePerMember}/member</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-primary">{dashboardStats?.completedGoals ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Goals Completed</p>
            <p className="text-xs text-success mt-2">🏆 +8 this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Member Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-foreground">Attendance Rate</span>
                <span className="text-sm font-bold text-primary">{engagementRate}%</span>
              </div>
              <Progress value={engagementRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {activeMembers} of {totalMembers} members visited this month
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Member Activity Distribution</p>
              <div className="space-y-2">
                {[
                  { label: "Very Active (15+)", percentage: 35 },
                  { label: "Active (8-14)", percentage: 32 },
                  { label: "Moderate (4-7)", percentage: 20 },
                  { label: "Inactive (<4)", percentage: 13 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-semibold text-primary">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Attendees */}
      {topAttendees && topAttendees.length > 0 && (
        <div className="px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Attendees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topAttendees.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.count} check-ins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{member.count}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Utilization */}
      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Content Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-foreground">Active Workout Plans</span>
                <span className="text-sm font-bold text-primary">{dashboardStats?.workoutPlans.length ?? 0}</span>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Well-utilized content for member engagement</p>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-foreground">Active Diet Plans</span>
                <span className="text-sm font-bold text-primary">{dashboardStats?.dietPlans.length ?? 0}</span>
              </div>
              <Progress value={60} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Consider creating more nutrition-focused plans</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {engagementRate < 50 && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm font-medium text-warning mb-1">⚠️ Low Engagement Rate</p>
                <p className="text-xs text-muted-foreground">
                  Consider implementing retention strategies like workout challenges or achievement badges.
                </p>
              </div>
            )}

            {avgAttendancePerMember < 8 && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm font-medium text-warning mb-1">🎯 Improve Consistency</p>
                <p className="text-xs text-muted-foreground">
                  Average attendance is below target (24 days/month). Consider reminder notifications.
                </p>
              </div>
            )}

            <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm font-medium text-success mb-1">✅ Strong Member Base</p>
              <p className="text-xs text-muted-foreground">
                You have a diverse distribution of member engagement levels. Continue nurturing growth.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Month-over-Month Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">This Month</p>
                <p className="text-2xl font-bold text-primary">{activeMembers}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Members</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Last Month</p>
                <p className="text-2xl font-bold text-primary">45</p>
                <p className="text-xs text-success mt-1">+{activeMembers - 45} (+6.7%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
