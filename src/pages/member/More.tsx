import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  CalendarCheck,
  Trophy,
  CreditCard,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "QR Check-in / History", icon: CalendarCheck, path: "/member/attendance", color: "text-warning" },
  { title: "Notifications", icon: Bell, path: "/member/notifications", color: "text-primary" },
  { title: "Badges & Achievements", icon: Trophy, path: "/member/achievements", color: "text-yellow-400" },
  { title: "My Memberships", icon: CreditCard, path: "/member/membership", color: "text-primary" },
  { title: "My Profile", icon: User, path: "/member/profile", color: "text-primary" },
  { title: "App Settings", icon: Settings, path: "/member/settings", color: "text-muted-foreground" },
  { title: "Support & Help", icon: HelpCircle, path: "/member/help", color: "text-muted-foreground" },
];

export default function MemberMorePage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="More" subtitle="Account & Extra Features" />

      <div className="px-4 space-y-2">
        {menuItems.map((item) => (
          <Card key={item.path} className="cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate(item.path)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <span className="font-medium text-foreground">{item.title}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}

        <hr className="my-4 border-border" />

        <Card className="cursor-pointer border-destructive/20 hover:bg-destructive/5 transition-all" onClick={() => signOut()}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <span className="font-medium text-destructive">Logout</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 mt-8 pb-8 text-center space-y-1">
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <Info className="h-3 w-3" /> Member ID: {user?.id.slice(0, 8)}...
        </p>
        <p className="text-[10px] text-muted-foreground">Rudra Fitness v2.1.0 • Built for Performance</p>
      </div>
    </div>
  );
}
