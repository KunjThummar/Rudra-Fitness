import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Menu, CreditCard, Dumbbell, Salad, Users, Megaphone,
  Settings, HelpCircle, LogOut, ClipboardList, Calendar,
  Bell, User, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const adminMenuItems = [
  { title: "Membership Plans", path: "/admin/plans", icon: ClipboardList },
  { title: "Workouts", path: "/admin/workouts", icon: Dumbbell },
  { title: "Diet Plans", path: "/admin/diet-plans", icon: Salad },
  { title: "Trainers", path: "/admin/trainers", icon: Users },
  { title: "Announcements", path: "/admin/announcements", icon: Megaphone },
];

const memberMenuItems = [
  { title: "Membership", path: "/member/membership", icon: CreditCard },
  { title: "Attendance", path: "/member/attendance", icon: Calendar },
  { title: "Notifications", path: "/member/notifications", icon: Bell },
  { title: "Profile", path: "/member/profile", icon: User },
];

interface HamburgerMenuProps {
  role: UserRole;
}

export function HamburgerMenu({ role }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const menuItems = role === "admin" ? adminMenuItems : memberMenuItems;

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Separator />

        <nav className="flex flex-col p-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.title}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </nav>

        <Separator />

        <nav className="flex flex-col p-2">
          <button
            onClick={() => handleNav("/settings")}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => handleNav("/help")}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </button>
        </nav>

        <div className="mt-auto p-2">
          <Separator className="mb-2" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
