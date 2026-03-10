import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  CalendarCheck,
  Dumbbell,
  Salad,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "Manage Workouts", icon: Dumbbell, path: "/admin/workouts", color: "text-primary" },
  { title: "Diet Plans", icon: Salad, path: "/admin/diet-plans", color: "text-success" },
  { title: "Attendance & QR", icon: CalendarCheck, path: "/admin/attendance", color: "text-warning" },
  { title: "Broadcast Announcements", icon: Bell, path: "/admin/announcements", color: "text-primary" },
  { title: "Manage Trainers", icon: Users, path: "/admin/trainers", color: "text-primary" },
  { title: "App Settings", icon: Settings, path: "/admin/settings", color: "text-muted-foreground" },
  { title: "Support & Help", icon: HelpCircle, path: "/admin/help", color: "text-muted-foreground" },
];

export default function AdminMorePage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Menu" subtitle="Administrator Controls" />

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
        <p className="text-xs text-muted-foreground">Rudra Fitness Admin v2.1.0</p>
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Secure Administrator Session
        </p>
      </div>
    </div>
  );
}
