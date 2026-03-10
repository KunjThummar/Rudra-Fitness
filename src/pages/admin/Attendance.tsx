import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, QrCode, Users, TrendingUp, Clock, Search, CheckCircle, UserCheck } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

export default function AttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState<"today" | "history" | "qr">("today");
  const [scanResult, setScanResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [qrToken, setQrToken] = useState("");

  const { data: todayAttendance, isLoading: todayLoading } = useQuery({
    queryKey: ["attendance-today", selectedDate],
    queryFn: async () => {
      const start = new Date(selectedDate + "T00:00:00");
      const end = new Date(selectedDate + "T23:59:59");
      const { data, error } = await supabase
        .from("attendance")
        .select("*, profiles(full_name, avatar_url)")
        .gte("check_in", start.toISOString())
        .lte("check_in", end.toISOString())
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["attendance-analytics"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const [{ count: todayCount }, { count: weekCount }, { data: streaks }] = await Promise.all([
        supabase.from("attendance").select("*", { count: "exact", head: true })
          .gte("check_in", startOfDay(new Date()).toISOString()),
        supabase.from("attendance").select("*", { count: "exact", head: true })
          .gte("check_in", sevenDaysAgo),
        supabase.from("attendance_streaks").select("*").order("current_streak", { ascending: false }).limit(5),
      ]);
      return { todayCount: todayCount ?? 0, weekCount: weekCount ?? 0, topStreaks: streaks ?? [] };
    },
  });

  const manualCheckInMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("attendance").insert([{
        user_id: userId, method: "admin", check_in: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member checked in!" });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-analytics"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member checked out!" });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const validateQrMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("check_in_via_qr", { p_token: token });
      if (error) throw error;
      return data as { success: boolean; action?: string; error?: string };
    },
    onSuccess: (result) => {
      if (result.success) {
        setScanResult({ ok: true, msg: `✅ ${result.action === "check_in" ? "Checked In" : "Checked Out"} successfully!` });
        queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-analytics"] });
        setQrToken("");
      } else {
        setScanResult({ ok: false, msg: `❌ ${result.error}` });
      }
    },
    onError: (e: any) => setScanResult({ ok: false, msg: `❌ ${e.message}` }),
  });

  const filteredAttendance = (todayAttendance ?? []).filter(a =>
    a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "Still in";
    const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Attendance" subtitle="Track gym check-ins and member activity" />

      {/* Stats Row */}
      <div className="px-4 grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: analytics?.todayCount ?? 0, icon: CalendarCheck, color: "text-primary" },
          { label: "This Week", value: analytics?.weekCount ?? 0, icon: TrendingUp, color: "text-success" },
          { label: "Now Inside", value: (todayAttendance ?? []).filter(a => !a.check_out).length, icon: Users, color: "text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex flex-col items-center">
              <Icon className={`h-5 w-5 ${color} mb-1`} />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto">
        {(["today", "history", "qr"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "qr" ? "QR Scanner" : tab === "today" ? "Check-ins" : "History"}
          </button>
        ))}
      </div>

      {/* Today / History Tab */}
      {(activeTab === "today" || activeTab === "history") && (
        <div className="px-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search member..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="w-44 bg-card border-border text-foreground" />
          </div>

          <p className="text-sm text-muted-foreground">{filteredAttendance.length} check-ins on {format(new Date(selectedDate), "MMM d, yyyy")}</p>

          {todayLoading ? <LoadingSpinner text="Loading attendance..." /> : filteredAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No check-ins found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttendance.map(record => (
                <Card key={record.id} className={`transition-all ${!record.check_out ? "border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {record.profiles?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{record.profiles?.full_name ?? "Unknown"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(record.check_in), "h:mm a")}
                          {record.check_out && ` → ${format(new Date(record.check_out), "h:mm a")}`}
                        </span>
                        <span>{formatDuration(record.check_in, record.check_out)}</span>
                        {record.method && <Badge variant="outline" className="text-[10px] py-0">{record.method}</Badge>}
                      </div>
                    </div>
                    {!record.check_out && (
                      <Button size="sm" variant="outline" onClick={() => checkOutMutation.mutate(record.id)}>
                        <UserCheck className="h-4 w-4 mr-1" /> Check Out
                      </Button>
                    )}
                    {record.check_out && <CheckCircle className="h-5 w-5 text-success shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Tab */}
      {activeTab === "qr" && (
        <div className="px-4 space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">QR Code Check-in</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan or paste the member's QR token to check them in or out automatically.
              </p>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5">
                <QrCode className="h-16 w-16 text-primary/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">QR camera scanning available in native app.</p>
                <p className="text-xs text-muted-foreground mt-1">Use token input below for manual entry.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste QR token here..."
                  value={qrToken}
                  onChange={e => { setQrToken(e.target.value); setScanResult(null); }}
                  className="font-mono text-sm"
                />
                <Button onClick={() => validateQrMutation.mutate(qrToken)} disabled={!qrToken || validateQrMutation.isPending}>
                  {validateQrMutation.isPending ? "Checking..." : "Validate"}
                </Button>
              </div>
              {scanResult && (
                <div className={`rounded-lg p-3 text-sm font-medium ${scanResult.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  {scanResult.msg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Streaks */}
          {(analytics?.topStreaks ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">🔥 Top Streaks</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {analytics!.topStreaks.map((streak: any, i: number) => (
                    <div key={streak.member_id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <span className="text-sm text-foreground">{streak.member_id.slice(0, 8)}…</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-primary font-bold">{streak.current_streak} days</span>
                        <span className="text-muted-foreground">{streak.total_visits} total</span>
                      </div>
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
