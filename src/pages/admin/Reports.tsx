import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Activity, Users, Currency, TrendingUp, DollarSign } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export default function ReportsPage() {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const today = new Date();
      const firstDay = startOfMonth(today);
      const lastDay = endOfMonth(today);
      const lastMonthFirstDay = startOfMonth(subDays(firstDay, 1));
      
      const [
        { count: newMembersCount },
        { data: monthlyPayments },
        { count: totalAttendanceThisMonth },
      ] = await Promise.all([
        supabase.from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString()),
          
        supabase.from("payments")
          .select("amount")
          .eq("status", "paid")
          .gte("payment_date", firstDay.toISOString())
          .lte("payment_date", lastDay.toISOString()),
          
        supabase.from("attendance")
          .select("*", { count: "exact", head: true })
          .gte("check_in", firstDay.toISOString())
          .lte("check_in", lastDay.toISOString()),
      ]);

      const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

      return {
        newMembersCount: newMembersCount || 0,
        monthlyRevenue,
        totalAttendanceThisMonth: totalAttendanceThisMonth || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Generating reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Data for ${format(new Date(), "MMMM yyyy")}`}
      />

      <div className="px-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData?.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-500">Collected this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Sign-ups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{reportData?.newMembersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">New accounts this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gym Traffic</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.totalAttendanceThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Total check-ins this month</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">Export Data</CardTitle>
            <BarChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Download complete statements as CSV</p>
            <button className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
              Download CSV
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
