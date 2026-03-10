import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Play, CheckCircle, Clock, Flame, ChevronRight } from "lucide-react";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-success/15 text-success border-success/30",
  intermediate: "bg-warning/15 text-warning border-warning/30",
  advanced: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function MemberWorkoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"assigned" | "log">("assigned");
  const [loggingPlanId, setLoggingPlanId] = useState<string | null>(null);

  const { data: assignedWorkouts, isLoading } = useQuery({
    queryKey: ["member-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_workouts")
        .select("*, workout_plans(id, name, description, difficulty, goal, duration_weeks, days_per_week, estimated_duration_minutes)")
        .eq("member_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["workout-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*, workout_plans(name)")
        .eq("member_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const startSessionMutation = useMutation({
    mutationFn: async (planId: string | null) => {
      const { data, error } = await supabase
        .from("workout_logs")
        .insert([{ member_id: user!.id, workout_plan_id: planId, started_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Workout started! 💪", description: "Your session has been logged." });
      setLoggingPlanId(data.id);
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({ logId, rating }: { logId: string; rating: number }) => {
      const { error } = await supabase
        .from("workout_logs")
        .update({ completed_at: new Date().toISOString(), rating })
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Workout complete! 🏆", description: "Great job today!" });
      setLoggingPlanId(null);
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
    },
  });

  const totalSessions = recentLogs?.length ?? 0;
  const completedSessions = recentLogs?.filter(l => l.completed_at).length ?? 0;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="My Workouts" subtitle="Your assigned plans and session history" />

      {/* Stats */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{assignedWorkouts?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Active Plans</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{completedSessions}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{totalSessions}</p>
          <p className="text-[10px] text-muted-foreground">Total Sessions</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["assigned", "log"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "assigned" ? "My Plans" : "Session Log"}
          </button>
        ))}
      </div>

      {/* Active Plans */}
      {activeTab === "assigned" && (
        <div className="px-4 space-y-3">
          {isLoading ? <LoadingSpinner text="Loading your plans..." /> : (assignedWorkouts ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No workout plans assigned yet</p>
              <p className="text-sm mt-1">Ask your trainer to assign a plan.</p>
            </div>
          ) : (
            (assignedWorkouts ?? []).map(assignment => {
              const plan = assignment.workout_plans;
              if (!plan) return null;
              return (
                <Card key={assignment.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{plan.name}</h3>
                          <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[plan.difficulty]}`}>
                            {plan.difficulty}
                          </Badge>
                        </div>
                        {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" />{plan.estimated_duration_minutes}min</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-primary" />{plan.days_per_week}x/week</span>
                      <span>{plan.duration_weeks} weeks · {plan.goal?.replace("_", " ")}</span>
                    </div>
                    {loggingPlanId ? (
                      <div className="bg-success/10 border border-success/20 rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium text-success flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Session in progress...
                        </p>
                        <p className="text-xs text-muted-foreground">Rate your workout:</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(r => (
                            <button key={r} onClick={() => completeSessionMutation.mutate({ logId: loggingPlanId, rating: r })}
                              className="flex-1 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all">
                              {r}⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => startSessionMutation.mutate(plan.id ?? null)}
                        disabled={startSessionMutation.isPending}>
                        <Play className="h-4 w-4 mr-2" />
                        {startSessionMutation.isPending ? "Starting..." : "Start Session"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Session Log */}
      {activeTab === "log" && (
        <div className="px-4 space-y-2">
          {(recentLogs ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No sessions logged yet.</p>
            </div>
          ) : (
            (recentLogs ?? []).map(log => (
              <Card key={log.id} className={log.completed_at ? "" : "border-warning/30"}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    log.completed_at ? "bg-success/10" : "bg-warning/10"
                  }`}>
                    {log.completed_at
                      ? <CheckCircle className="h-5 w-5 text-success" />
                      : <Clock className="h-5 w-5 text-warning" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.workout_plans?.name ?? "Free Session"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {log.completed_at
                      ? <p className="text-xs text-success font-medium">✓ Done</p>
                      : <p className="text-xs text-warning font-medium">In progress</p>
                    }
                    {log.rating && <p className="text-xs text-muted-foreground">{log.rating}⭐</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
