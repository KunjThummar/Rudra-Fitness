import { Dumbbell, Calendar, TrendingUp, CreditCard } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";

export default function MemberDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back!" />
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          title="Workouts Done"
          value={18}
          change="This month"
          changeType="neutral"
          icon={Dumbbell}
        />
        <StatCard
          title="Attendance"
          value="85%"
          change="+5% vs last month"
          changeType="positive"
          icon={Calendar}
        />
        <StatCard
          title="Progress"
          value="72%"
          change="Goal completion"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Next Payment"
          value="15 Mar"
          change="₹2,500 due"
          changeType="neutral"
          icon={CreditCard}
        />
      </div>
    </div>
  );
}
