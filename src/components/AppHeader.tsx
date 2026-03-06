import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showNotifications?: boolean;
}

export function AppHeader({ title, onMenuClick, showNotifications = true }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b bg-card safe-top">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        )}
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
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            RF
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
