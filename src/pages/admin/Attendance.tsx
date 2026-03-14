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
import { Calendar, Clock, CheckCircle, Download, Filter, Search, TrendingUp, Users, BarChart3, Camera, X } from "lucide-react";
import { format, parseISO, isToday, startOfMonth, endOfMonth } from "date-fns";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

export default function AdminAttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"scan" | "today" | "monthly" | "members" | "reports">("scan");
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [qrToken, setQrToken] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanningCooldown, setScanningCooldown] = useState(false);

  // Queries
  const { data: dateAttendance, isLoading: dateLoading } = useQuery({
    queryKey: ["attendance-date", filterDate],
    queryFn: async () => {
      const startDate = filterDate + "T00:00:00";
      const endDate = filterDate + "T23:59:59";

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in", startDate)
        .lte("check_in", endDate)
        .order("check_in", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: monthlyAttendance } = useQuery({
    queryKey: ["attendance-monthly", filterMonth],
    queryFn: async () => {
      const [year, month] = filterMonth.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in", start)
        .lte("check_in", end)
        .order("check_in", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: membersList } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: memberAttendanceCounts } = useQuery({
    queryKey: ["member-attendance-summary", filterMonth],
    queryFn: async () => {
      const [year, month] = filterMonth.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("user_id")
        .gte("check_in", start)
        .lte("check_in", end);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach(record => {
        counts[record.user_id] = (counts[record.user_id] || 0) + 1;
      });

      return counts;
    },
  });

  const scanQRMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { data: member, error: memberErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", memberId)
        .single();
        
      if (memberErr || !member) throw new Error("Invalid User QR");

      const startDate = format(new Date(), "yyyy-MM-dd") + "T00:00:00";
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", memberId)
        .gte("check_in", startDate)
        .is("check_out", null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", existing.id);
        if (error) throw error;
        return { success: true, action: "check_out", memberName: member.full_name };
      } else {
        // Omitting 'method' parameter below to avoid Supabase postgREST schema cache errors
        const { error } = await supabase.from("attendance").insert([{ user_id: memberId }]);
        if (error) throw error;
        return { success: true, action: "check_in", memberName: member.full_name };
      }
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Success!", description: `Member ${data.memberName} ${data.action.replace("_", " ")} successful.` });
        setQrToken("");
        queryClient.invalidateQueries({ queryKey: ["attendance-date"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-monthly"] });
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Calculations
  const membersMap = Object.fromEntries((membersList ?? []).map((m: any) => [m.id, m]));

  const enrichedDateAttendance = (dateAttendance ?? []).map((a: any) => ({
    ...a,
    profile: membersMap[a.user_id]
  }));

  const todayAttendees = dateAttendance?.length ?? 0;
  const todayUniqueMembers = new Set((dateAttendance ?? []).map(a => a.user_id)).size;
  const filteredAttendance = enrichedDateAttendance.filter(a =>
    (a.profile?.full_name || "Unknown Member").toLowerCase().includes(search.toLowerCase())
  );

  const monthlyTotal = monthlyAttendance?.length ?? 0;
  const monthlyUniqueMembers = new Set((monthlyAttendance ?? []).map(a => a.user_id)).size;

  const avgAttendancePerMember = monthlyUniqueMembers > 0 ? Math.round(monthlyTotal / monthlyUniqueMembers) : 0;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Attendance" subtitle="Monitor gym check-ins and member presence" />

      {/* KPI Cards */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todayUniqueMembers}</p>
            <p className="text-[10px] text-muted-foreground">Today's Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todayAttendees}</p>
            <p className="text-[10px] text-muted-foreground">Total Check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{monthlyUniqueMembers}</p>
            <p className="text-[10px] text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{avgAttendancePerMember}</p>
            <p className="text-[10px] text-muted-foreground">Avg/Member</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto">
        {(["scan", "today", "monthly", "members", "reports"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "scan" ? "📷 Scan QR" : tab === "today" ? "📅 Today" : tab === "monthly" ? "📊 Monthly" : tab === "members" ? "👥 Members" : "📈 Reports"}
          </button>
        ))}
      </div>

      {/* Scan QR */}
      {activeTab === "scan" && (
        <div className="px-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-center">Scan Member QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-sm mx-auto">
              {!isCameraActive ? (
                <div onClick={() => setIsCameraActive(true)} className="border-2 border-dashed border-primary/50 cursor-pointer hover:bg-primary/10 transition-colors rounded-lg p-12 text-center aspect-square flex flex-col items-center justify-center bg-primary/5">
                  <Camera className="h-12 w-12 text-primary/50 mb-4" />
                  <p className="text-sm font-semibold text-foreground">Tap to activate camera</p>
                  <p className="text-xs text-muted-foreground mt-1">Point at member's QR code</p>
                </div>
              ) : (
                <div className="relative border-2 border-primary rounded-lg overflow-hidden bg-black aspect-square flex items-center justify-center">
                  <BarcodeScannerComponent
                    width="100%"
                    height="100%"
                    delay={300}
                    onUpdate={(err, result) => {
                      if (result && !scanningCooldown) {
                        setQrToken(result.getText());
                        scanQRMutation.mutate(result.getText());
                        setIsCameraActive(false);
                        
                        // Prevent rapid double-scans
                        setScanningCooldown(true);
                        setTimeout(() => setScanningCooldown(false), 3000);
                      }
                    }}
                  />
                  <div className="absolute top-2 right-2 z-10">
                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg" onClick={() => setIsCameraActive(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">Scanner Active</Badge>
                  </div>
                </div>
              )}
              
              <div className="relative flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Or manual entry:</span>
                <Input
                  placeholder="Paste ID token..."
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="font-mono text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && qrToken) {
                      scanQRMutation.mutate(qrToken);
                    }
                  }}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => scanQRMutation.mutate(qrToken)}
                disabled={!qrToken || scanQRMutation.isPending}
              >
                {scanQRMutation.isPending ? "Validating..." : "Process Check-in / Out"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Attendance */}
      {activeTab === "today" && (
        <div className="px-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {todayAttendees} check-ins
            </Badge>
            <Badge variant="outline" className="text-xs">
              {todayUniqueMembers} members
            </Badge>
          </div>

          {dateLoading ? (
            <LoadingSpinner text="Loading attendance..." />
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No check-ins for {format(parseISO(filterDate), "MMM d, yyyy")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttendance.map((record) => {
                const duration = record.check_out
                  ? Math.round((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60))
                  : null;

                return (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {record.profile?.full_name || "Unknown Member"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs capitalize">{record.method}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(record.check_in), "h:mm a")}
                            </span>
                            {record.check_out && (
                              <>
                                <span className="text-xs text-muted-foreground">→</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(record.check_out), "h:mm a")}
                                </span>
                              </>
                            )}
                          </div>
                          {duration && (
                            <p className="text-xs text-muted-foreground mt-1">⏱️ {duration} min</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {record.check_out ? (
                            <span className="text-xs font-semibold text-success">✓ Out</span>
                          ) : (
                            <span className="text-xs font-semibold text-warning">• Active</span>
                          )}
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

      {/* Monthly Attendance */}
      {activeTab === "monthly" && (
        <div className="px-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{monthlyTotal}</p>
                <p className="text-xs text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{monthlyUniqueMembers}</p>
                <p className="text-xs text-muted-foreground">Unique Members</p>
              </CardContent>
            </Card>
          </div>

          {monthlyAttendance && monthlyAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No attendance data for this month</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attendance Timeline</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>Total records: {monthlyAttendance?.length ?? 0} check-ins</p>
                <p className="mt-2">Date range: {format(parseISO(filterMonth + "-01"), "MMM 1")} - {format(endOfMonth(parseISO(filterMonth + "-01")), "MMM d, yyyy")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Members Attendance */}
      {activeTab === "members" && (
        <div className="px-4 space-y-3">
          <div className="flex gap-2">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {!membersList || !memberAttendanceCounts ? (
            <LoadingSpinner text="Loading members..." />
          ) : membersList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {membersList
                .filter((m: any) => (m.full_name || "").toLowerCase().includes(search.toLowerCase()))
                .map((member: any) => {
                  const count = memberAttendanceCounts[member.id] || 0;
                  const percentage = Math.round((count / 24) * 100);

                  return (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{member.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{count} check-ins this month</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-primary">{percentage}%</p>
                            <Badge
                              variant={percentage >= 80 ? "default" : percentage >= 50 ? "secondary" : "outline"}
                              className="text-xs mt-1"
                            >
                              {percentage >= 80 ? "Regular" : percentage >= 50 ? "Good" : "Low"}
                            </Badge>
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

      {/* Reports */}
      {activeTab === "reports" && (
        <div className="px-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Monthly Attendance Rate</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${monthlyUniqueMembers > 0 ? (monthlyUniqueMembers / (membersList?.length || 1)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="ml-3 text-sm font-semibold text-primary">
                    {membersList?.length ? Math.round((monthlyUniqueMembers / membersList.length) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Average Sessions per Member</p>
                <p className="text-2xl font-bold text-primary">{avgAttendancePerMember}</p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground font-semibold mb-3">Top Attendees (This Month)</p>
                {membersList && memberAttendanceCounts ? (
                  membersList
                    .slice()
                    .sort((a, b) => (memberAttendanceCounts[b.id] || 0) - (memberAttendanceCounts[a.id] || 0))
                    .slice(0, 5)
                    .map((member, idx) => (
                      <div key={member.id} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                          <span className="text-foreground truncate">{member.full_name || "Unknown"}</span>
                        </div>
                        <span className="font-semibold text-primary">{memberAttendanceCounts[member.id] || 0}x</span>
                      </div>
                    ))
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" /> Export Monthly Report (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" /> Export Member List
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
