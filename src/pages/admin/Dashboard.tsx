import { Users, CreditCard, Dumbbell, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";

export default function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back, Admin" />
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          title="Total Members"
          value={128}
          change="+12% this month"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value="₹1.2L"
          change="+8% this month"
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Active Plans"
          value={96}
          change="75% of total"
          changeType="neutral"
          icon={Dumbbell}
        />
        <StatCard
          title="Attendance"
          value="82%"
          change="-3% vs last week"
          changeType="negative"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
