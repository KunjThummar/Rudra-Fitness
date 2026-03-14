import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Trash2,
  Check,
  Settings,
  Mail,
  Smartphone,
  Volume2,
  Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  payment: <Zap className="h-5 w-5 text-purple-500" />,
  workout: <Zap className="h-5 w-5 text-orange-500" />,
  achievement: <CheckCircle className="h-5 w-5 text-green-500" />,
  announcement: <Bell className="h-5 w-5 text-primary" />,
};

export default function MemberNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "announcements" | "settings">("all");
  const [showSettings, setShowSettings] = useState(false);

  // Queries
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast({
              title: payload.new.title || "New Notification",
              description: payload.new.message,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "All notifications marked as read" });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs: any) => {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user!.id,
          ...prefs,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Preferences updated!" });
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  // Calculations
  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length;
  const filteredNotifications = activeTab === "unread"
    ? (notifications ?? []).filter(n => !n.is_read)
    : (notifications ?? []);

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Notifications" subtitle="Stay updated with gym announcements and events" />

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="px-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">You have {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}</span>
              </div>
              <Button size="sm" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}>
                Mark all read
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto">
        {(["all", "unread", "announcements", "settings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all"
              ? `📬 All (${notifications?.length ?? 0})`
              : tab === "unread"
              ? `🔔 Unread (${unreadCount})`
              : tab === "announcements"
              ? `📢 Announcements`
              : "⚙️ Settings"}
          </button>
        ))}
      </div>

      {/* All & Unread Notifications */}
      {(activeTab === "all" || activeTab === "unread") && (
        <div className="px-4 space-y-3">
          {isLoading ? (
            <LoadingSpinner text="Loading notifications..." />
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{activeTab === "unread" ? "No unread notifications" : "No notifications yet"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`transition-all ${
                    !notif.is_read
                      ? "border-primary/30 bg-primary/5"
                      : "hover:border-primary/30"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 pt-1">
                        {NOTIFICATION_ICONS[notif.type] || <Bell className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-foreground text-sm">{notif.title}</h4>
                          {!notif.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {notif.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(notif.created_at), "MMM d 'at' h:mm a")}
                          </span>
                        </div>
                        {notif.action_label && (
                          <Button size="sm" variant="outline" className="mt-2">
                            {notif.action_label}
                          </Button>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex gap-1">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(notif.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotificationMutation.mutate(notif.id)}
                          disabled={deleteNotificationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements */}
      {activeTab === "announcements" && (
        <div className="px-4 space-y-3">
          {(announcements ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active announcements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements?.map((announcement) => {
                const priorityColor: Record<string, string> = {
                  low: "bg-muted text-muted-foreground",
                  normal: "bg-blue-500/20 text-blue-700",
                  high: "bg-orange-500/20 text-orange-700",
                  urgent: "bg-red-500/20 text-red-700",
                };

                return (
                  <Card key={announcement.id} className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-sm">{announcement.title}</h4>
                            <Badge className={`text-xs capitalize ${priorityColor[announcement.priority] ?? priorityColor.normal}`}>
                              {announcement.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {announcement.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(announcement.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div className="px-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">In-app notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences?.push_enabled ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      push_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences?.email_enabled ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      email_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Payment Reminders</span>
                <input
                  type="checkbox"
                  checked={preferences?.payment_reminders ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      payment_reminders: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Workout Reminders</span>
                <input
                  type="checkbox"
                  checked={preferences?.workout_reminders ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      workout_reminders: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Achievement Alerts</span>
                <input
                  type="checkbox"
                  checked={preferences?.achievement_alerts ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      achievement_alerts: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Announcements</span>
                <input
                  type="checkbox"
                  checked={preferences?.announcement_alerts ?? true}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      announcement_alerts: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Reminder Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">Daily reminder time</p>
              <input
                type="time"
                defaultValue={preferences?.reminder_time ?? "08:00"}
                onChange={(e) =>
                  updatePreferencesMutation.mutate({
                    reminder_time: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
