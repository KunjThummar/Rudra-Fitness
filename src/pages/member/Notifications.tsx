import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle, Info, AlertTriangle, Star, Trophy, CreditCard, BellOff } from "lucide-react";
import { format } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  payment: CreditCard,
  workout: Star,
  achievement: Trophy,
  announcement: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  payment: "text-warning",
  workout: "text-primary",
  achievement: "text-yellow-400",
  announcement: "text-primary",
};

export default function MemberNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["member-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notifId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read", { p_user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "All notifications marked as read." });
      queryClient.invalidateQueries({ queryKey: ["member-notifications"] });
    },
  });

  const filtered = filter === "unread"
    ? (notifications ?? []).filter(n => !n.is_read)
    : (notifications ?? []);

  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Notifications" subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"} />

      {/* Header Actions */}
      <div className="px-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "unread"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="px-4 space-y-2">
        {isLoading ? <LoadingSpinner text="Loading notifications..." /> : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          </div>
        ) : (
          filtered.map(notif => {
            const Icon = TYPE_ICONS[notif.type] ?? Info;
            const color = TYPE_COLORS[notif.type] ?? "text-primary";
            return (
              <Card key={notif.id}
                className={`cursor-pointer transition-all hover:border-primary/30 ${!notif.is_read ? "border-primary/20 bg-primary/5" : ""}`}
                onClick={() => { if (!notif.is_read) markReadMutation.mutate(notif.id); }}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg bg-card flex items-center justify-center shrink-0 border border-border`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notif.is_read ? "text-foreground/80" : "text-foreground"}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {format(new Date(notif.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
