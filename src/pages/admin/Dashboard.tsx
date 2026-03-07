import { Users, CreditCard, Dumbbell, TrendingUp, Plus, UserPlus, Bell, CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalMembers },
        { count: activeMemberships },
        { data: pendingPayments },
        { data: recentPayments },
        { count: todayAttendance },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("memberships").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payments").select("amount").eq("status", "pending"),
        supabase.from("payments").select("amount").eq("status", "paid"),
        supabase.from("attendance").select("*", { count: "exact", head: true })
          .gte("check_in", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      const pendingTotal = pendingPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
      const revenueTotal = recentPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

      return {
        totalMembers: totalMembers ?? 0,
        activeMemberships: activeMemberships ?? 0,
        pendingAmount: pendingTotal,
        revenue: revenueTotal,
        todayAttendance: todayAttendance ?? 0,
      };
    },
  });

  const { data: recentMembers } = useQuery({
    queryKey: ["admin-recent-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, created_at, avatar_url")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentPaymentsList } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ""}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          title="Total Members"
          value={stats?.totalMembers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats?.revenue ?? 0)}
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Active Plans"
          value={stats?.activeMemberships ?? 0}
          icon={Dumbbell}
        />
        <StatCard
          title="Today's Check-ins"
          value={stats?.todayAttendance ?? 0}
          icon={TrendingUp}
        />
      </div>

      {/* Pending Payments Alert */}
      {(stats?.pendingAmount ?? 0) > 0 && (
        <div className="mx-4">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Pending Payments</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pendingAmount ?? 0)} outstanding
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/admin/payments")}>
                View
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: UserPlus, label: "Add Member", path: "/admin/members/add" },
            { icon: CreditCard, label: "Payments", path: "/admin/payments" },
            { icon: CalendarCheck, label: "Attendance", path: "/admin/attendance" },
            { icon: Bell, label: "Announce", path: "/admin/announcements" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-card border border-border p-3 hover:bg-accent transition-colors"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Members */}
      <div className="px-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Members</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/admin/members")}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentMembers && recentMembers.length > 0 ? (
              <div className="divide-y divide-border">
                {recentMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => navigate(`/admin/members/${member.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-primary">
                      {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No members yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <div className="px-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Payments</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/admin/payments")}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentPaymentsList && recentPaymentsList.length > 0 ? (
              <div className="divide-y divide-border">
                {recentPaymentsList.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">₹{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <StatusBadge status={payment.status as "paid" | "pending" | "overdue"} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
