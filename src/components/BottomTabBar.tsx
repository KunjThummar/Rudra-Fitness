import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  MoreHorizontal,
  Dumbbell,
  Salad,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const adminTabs = [
  { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { title: "Members", path: "/admin/members", icon: Users },
  { title: "Payments", path: "/admin/payments", icon: CreditCard },
  { title: "Reports", path: "/admin/reports", icon: BarChart3 },
  { title: "More", path: "/admin/more", icon: MoreHorizontal },
];

const memberTabs = [
  { title: "Dashboard", path: "/member", icon: LayoutDashboard },
  { title: "Workouts", path: "/member/workouts", icon: Dumbbell },
  { title: "Diet", path: "/member/diet", icon: Salad },
  { title: "Progress", path: "/member/progress", icon: TrendingUp },
  { title: "More", path: "/member/more", icon: MoreHorizontal },
];

interface BottomTabBarProps {
  role: UserRole;
}

export function BottomTabBar({ role }: BottomTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = role === "admin" ? adminTabs : memberTabs;

  const isActive = (path: string) => {
    if (path === "/admin" || path === "/member") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
