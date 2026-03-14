import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, AlertCircle, Copy, RefreshCw, TrendingUp } from "lucide-react";
import { format, parseISO, isToday, getDay } from "date-fns";
import QRCode from "react-qr-code";

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"check-in" | "history" | "stats">("check-in");
  const [checkedInToday, setCheckedInToday] = useState(false);
  const currentTimeRef = useRef<string>("");

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      currentTimeRef.current = new Date().toLocaleTimeString();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Queries
  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance", user?.id],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user!.id)
        .gte("check_in", startOfDay)
        .lt("check_in", endOfDay)
        .order("check_in", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) setCheckedInToday(!!data);
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: attendanceHistory } = useQuery({
    queryKey: ["attendance-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user!.id)
        .order("check_in", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });



  // Calculations
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyAttendances = (attendanceHistory ?? []).filter(a => {
    const date = parseISO(a.check_in);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  const attendance30days = (attendanceHistory ?? []).filter(a => {
    const date = parseISO(a.check_in);
    const daysAgo = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 30;
  });

  const currentStreak = calculateStreak(attendanceHistory ?? []);

  function calculateStreak(records: any[]): number {
    if (!records.length) return 0;
    let streak = 0;
    let currentDate = new Date();

    while (true) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const hasAttendance = records.some(r => format(parseISO(r.check_in), "yyyy-MM-dd") === dateStr);

      if (hasAttendance) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  const qrCodeValue = user?.id || "";

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Attendance" subtitle="Check in and track your gym visit history" />

      {/* Stats Cards */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
            <p className="text-xs text-success mt-1">🔥 Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{monthlyAttendances.length}</p>
            <p className="text-[10px] text-muted-foreground">This Month</p>
            <p className="text-xs text-muted-foreground mt-1">{thisMonth + 1}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{attendance30days.length}</p>
            <p className="text-[10px] text-muted-foreground">Last 30 Days</p>
            <p className="text-xs text-muted-foreground mt-1">📊 Trend</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["check-in", "history", "stats"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "check-in" ? "Check In" : tab === "history" ? "History" : "Statistics"}
          </button>
        ))}
      </div>

      {/* Check-In Tab */}
      {activeTab === "check-in" && (
        <div className="px-4 space-y-4">
          {todayAttendance ? (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Welcome! 🎉</h3>
                  <p className="text-sm text-muted-foreground mt-1">You've checked in today</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(todayAttendance.check_in), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                {!todayAttendance.check_out && (
                  <p className="text-sm text-muted-foreground mt-4">Present your QR code to admin to check out</p>
                )}

                {todayAttendance.check_out && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Checked out at</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {format(parseISO(todayAttendance.check_out), "h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Duration: {Math.round((new Date(todayAttendance.check_out).getTime() - new Date(todayAttendance.check_in).getTime()) / (1000 * 60))} minutes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-primary mx-auto mb-3 opacity-70" />
                  <h3 className="text-lg font-semibold text-foreground">Ready to Workout?</h3>
                  <p className="text-sm text-muted-foreground mt-1">Show your QR to admin to check in automatically.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 px-4">Your QR Code</h3>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-primary flex items-center justify-center mx-auto" style={{ width: "200px", height: "200px" }}>
                    <div className="text-center text-xs text-muted-foreground flex flex-col items-center w-full">
                      {qrCodeValue ? (
                        <QRCode value={qrCodeValue} size={140} level="H" />
                      ) : (
                        <div className="h-[140px] w-[140px] bg-muted animate-pulse rounded-md" />
                      )}
                      <p className="font-mono font-bold break-all text-muted-foreground mt-4">{qrCodeValue.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => {
                        navigator.clipboard.writeText(qrCodeValue);
                        toast({ title: "Copied!", description: "QR token copied to clipboard." });
                    }}>
                      <Copy className="h-4 w-4 mr-2" /> Copy Token
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-muted-foreground">{attendanceHistory?.length ?? 0} check-ins recorded</p>

          {!attendanceHistory?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No check-ins yet.</p>
              <Button className="mt-3" onClick={() => setActiveTab("check-in")}>Start now</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceHistory?.map((record) => {
                const checkInTime = parseISO(record.check_in);
                const duration = record.check_out ? Math.round((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60)) : null;
                
                return (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          record.check_out
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}>
                          {record.check_out ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{format(checkInTime, "MMM d, yyyy")}</p>
                            <Badge variant="secondary" className="text-xs capitalize">{record.method}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(checkInTime, "h:mm a")}
                            {record.check_out && ` - ${format(parseISO(record.check_out), "h:mm a")}`}
                          </p>
                          {duration && (
                            <p className="text-xs text-muted-foreground">⏱️ {duration} minutes</p>
                          )}
                        </div>
                        {record.check_out ? (
                          <span className="text-xs font-semibold text-success">Checked Out</span>
                        ) : (
                          <span className="text-xs font-semibold text-warning">Active</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && (
        <div className="px-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {monthlyAttendances.length} / 30 days (Target: 24 days)
                </p>
                <ProgressBar value={(monthlyAttendances.length / 24) * 100} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{monthlyAttendances.length}</p>
                  <p className="text-xs text-muted-foreground">Days Attended</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{Math.round((monthlyAttendances.length / 24) * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Goal Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => {
                const dayAttendances = (attendanceHistory ?? []).filter(a => {
                  const date = parseISO(a.check_in);
                  return getDay(date) === idx && attendance30days.includes(a);
                });
                
                return (
                  <div key={day}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-muted-foreground">{day}</span>
                      <span className="font-semibold">{dayAttendances.length}x</span>
                    </div>
                    <ProgressBar value={Math.min((dayAttendances.length / 4.3) * 100, 100)} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentStreak >= 7 && <div className="flex items-center gap-2 text-sm"><span className="text-lg">🔥</span> <span>7-Day Streak!</span></div>}
              {currentStreak >= 30 && <div className="flex items-center gap-2 text-sm"><span className="text-lg">🏆</span> <span>30-Day Consistency!</span></div>}
              {monthlyAttendances.length >= 20 && <div className="flex items-center gap-2 text-sm"><span className="text-lg">⭐</span> <span>20+ Days This Month!</span></div>}
              {currentStreak === 0 && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-lg">💪</span> <span>Keep it up! Visit the gym to earn achievements</span></div>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
