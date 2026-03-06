import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";

interface AppHeaderProps {
  title: string;
  role: UserRole;
  showNotifications?: boolean;
}

export function AppHeader({ title, role, showNotifications = true }: AppHeaderProps) {
  const { profile } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "RF";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b bg-card safe-top">
      <div className="flex items-center gap-2">
        <HamburgerMenu role={role} />
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {showNotifications && (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary" />
          </Button>
        )}
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
