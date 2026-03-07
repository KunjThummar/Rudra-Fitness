import { Outlet, Navigate, useLocation } from "react-router-dom";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { UserRole } from "@/types";

interface AppLayoutProps {
  role: UserRole;
  title: string;
}

export function AppLayout({ role, title }: AppLayoutProps) {
  const { user, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userRole !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title={title} role={role} />
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomTabBar role={role} />
    </div>
  );
}
