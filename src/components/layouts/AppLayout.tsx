import { Outlet } from "react-router-dom";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AppHeader } from "@/components/AppHeader";
import type { UserRole } from "@/types";

interface AppLayoutProps {
  role: UserRole;
  title: string;
}

export function AppLayout({ role, title }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title={title} />
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomTabBar role={role} />
    </div>
  );
}
