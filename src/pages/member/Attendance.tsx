import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, QrCode, Flame, Clock, TrendingUp, Copy } from "lucide-react";
import { format } from "date-fns";

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"history" | "qr">("history");
  const [qrCopied, setQrCopied] = useState(false);

  const { data: attendanceHistory, isLoading } = useQuery({
    queryKey: ["member-attendance", user?.id],
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

  const { data: streak } = useQuery({
    queryKey: ["attendance-streak", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_streaks")
        .select("*")
        .eq("member_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: qrCode, refetch: refetchQr } = useQuery({
    queryKey: ["my-qr", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("member_id", user!.id)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const generateQrMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_member_qr", { p_member_id: user!.id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast({ title: "New QR code generated!" });
      refetchQr();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyToken = () => {
    if (qrCode?.token) {
      navigator.clipboard.writeText(qrCode.token);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
      toast({ title: "Token copied!" });
    }
  };

  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "–";
    const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="My Attendance" subtitle="Track your gym visits and streaks" />

      {/* Streak Stats */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">🔥 {streak?.current_streak ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{streak?.longest_streak ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{streak?.total_visits ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Total Visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["history", "qr"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "qr" ? "My QR Code" : "Visit History"}
          </button>
        ))}
      </div>

      {/* Attendance History */}
      {activeTab === "history" && (
        <div className="px-4 space-y-2">
          {isLoading ? <LoadingSpinner text="Loading attendance..." /> : (attendanceHistory ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No visits recorded yet.</p>
            </div>
          ) : (
            (attendanceHistory ?? []).map((record, i) => (
              <Card key={record.id} className={i === 0 ? "border-primary/30" : ""}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(record.check_in), "EEEE, MMM d, yyyy")}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(record.check_in), "h:mm a")}
                        {record.check_out && ` – ${format(new Date(record.check_out), "h:mm a")}`}
                      </span>
                      <span>{formatDuration(record.check_in, record.check_out)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {record.check_out
                      ? <p className="text-xs text-success font-medium">✓ Completed</p>
                      : <p className="text-xs text-warning font-medium">In gym</p>
                    }
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* QR Code */}
      {activeTab === "qr" && (
        <div className="px-4 space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">My Check-in QR Code</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Show this QR code to the gym staff or scan at the entrance to check in/out.
              </p>
              {qrCode ? (
                <div className="space-y-3">
                  {/* Visual QR Placeholder */}
                  <div className="border-2 border-primary/30 rounded-xl p-6 bg-white text-center relative">
                    <div className="grid grid-cols-5 grid-rows-5 gap-1 w-36 mx-auto">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`h-5 w-5 rounded-sm ${
                          [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,17,12].includes(i) ? "bg-gray-900" : "bg-white"
                        }`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3">Rudra Fitness QR</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Token (tap to copy)</p>
                    <button onClick={copyToken} className="w-full text-left flex items-center gap-2 group">
                      <code className="text-xs font-mono text-primary truncate flex-1">{qrCode.token}</code>
                      <Copy className={`h-4 w-4 shrink-0 transition-colors ${qrCopied ? "text-success" : "text-muted-foreground group-hover:text-primary"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Expires: {format(new Date(qrCode.expires_at), "MMM d, yyyy h:mm a")}
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => generateQrMutation.mutate()}>
                    Refresh QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <QrCode className="h-16 w-16 text-primary/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">No active QR code.</p>
                  <Button className="w-full" onClick={() => generateQrMutation.mutate()} disabled={generateQrMutation.isPending}>
                    {generateQrMutation.isPending ? "Generating..." : "Generate QR Code"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
