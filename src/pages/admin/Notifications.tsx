import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Megaphone, Plus, Users, Info, AlertTriangle, CheckCircle, Star } from "lucide-react";
import { format } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  general: Info,
  maintenance: AlertTriangle,
  promotion: Star,
  event: Users,
  emergency: AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-primary",
  high: "text-warning",
  urgent: "text-destructive",
};

export default function NotificationsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"announcements" | "create">("announcements");
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "", content: "", type: "general", target_audience: "all", priority: "normal",
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentNotifications } = useQuery({
    queryKey: ["admin-notifications-sent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (ann: typeof newAnnouncement) => {
      const { data: created, error } = await supabase
        .from("announcements")
        .insert([ann])
        .select()
        .single();
      if (error) throw error;
      // Broadcast to all relevant users
      await supabase.rpc("broadcast_announcement", { p_announcement_id: created.id });
      return created;
    },
    onSuccess: () => {
      toast({ title: "Announcement published and broadcasted!" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setNewAnnouncement({ title: "", content: "", type: "general", target_audience: "all", priority: "normal" });
      setActiveTab("announcements");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Announcement removed." });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Notifications" subtitle="Manage announcements and push notifications" />

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["announcements", "create"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "create" ? "New Announcement" : "Announcements"}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {activeTab === "announcements" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{(announcements ?? []).length} announcements</p>
            <Button size="sm" onClick={() => setActiveTab("create")}><Plus className="h-4 w-4 mr-1" /> New</Button>
          </div>

          {isLoading ? <LoadingSpinner text="Loading announcements..." /> : (announcements ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No announcements yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(announcements ?? []).map(ann => {
                const Icon = TYPE_ICONS[ann.type] ?? Info;
                return (
                  <Card key={ann.id} className={`transition-all ${ann.priority === "urgent" ? "border-destructive/40" : ann.priority === "high" ? "border-warning/30" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className={`h-4 w-4 ${PRIORITY_COLORS[ann.priority]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm">{ann.title}</h3>
                            <span className={`text-[10px] font-bold uppercase ${PRIORITY_COLORS[ann.priority]}`}>{ann.priority}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{ann.content}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>📣 {ann.target_audience}</span>
                            <span>🏷 {ann.type}</span>
                            <span>{format(new Date(ann.created_at), "MMM d, h:mm a")}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => deactivateMutation.mutate(ann.id)}>
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Announcement */}
      {activeTab === "create" && (
        <div className="px-4 space-y-3">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Broadcast Announcement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input className="mt-1" placeholder="Announcement title" value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement(a => ({...a, title: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Message *</label>
                <textarea
                  className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Write your announcement..."
                  value={newAnnouncement.content}
                  onChange={e => setNewAnnouncement(a => ({...a, content: e.target.value}))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select value={newAnnouncement.type} onChange={e => setNewAnnouncement(a => ({...a, type: e.target.value}))}
                    className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="promotion">Promotion</option>
                    <option value="event">Event</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Audience</label>
                  <select value={newAnnouncement.target_audience} onChange={e => setNewAnnouncement(a => ({...a, target_audience: e.target.value}))}
                    className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="all">All Users</option>
                    <option value="members">Members Only</option>
                    <option value="trainers">Trainers Only</option>
                    <option value="admins">Admins Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <select value={newAnnouncement.priority} onChange={e => setNewAnnouncement(a => ({...a, priority: e.target.value}))}
                    className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <Button className="w-full" onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}
                disabled={!newAnnouncement.title || !newAnnouncement.content || createAnnouncementMutation.isPending}>
                {createAnnouncementMutation.isPending ? "Publishing..." : "📣 Publish & Broadcast"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent sent */}
          {(recentNotifications ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Notifications Sent</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {(recentNotifications ?? []).slice(0, 5).map(n => (
                    <div key={n.id} className="px-4 py-3 flex items-center gap-3">
                      <Bell className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                      </div>
                      {n.is_read ? <CheckCircle className="h-4 w-4 text-success" /> : <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
