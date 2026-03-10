import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Target, Award, Scale, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { format } from "date-fns";

export default function MemberProgressPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"measurements" | "goals" | "achievements">("measurements");
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [measurement, setMeasurement] = useState({
    weight_kg: "", height_cm: "", body_fat_percentage: "", waist_cm: "", chest_cm: "", notes: "",
  });
  const [goal, setGoal] = useState({
    title: "", goal_type: "weight", target_value: "", unit: "kg", target_date: "",
  });

  const { data: measurements, isLoading: measLoading } = useQuery({
    queryKey: ["body-measurements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("member_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ["fitness-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("member_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: achievements } = useQuery({
    queryKey: ["member-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_achievements")
        .select("*, achievements(name, description, badge_icon, badge_color, category)")
        .eq("member_id", user!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: allAchievements } = useQuery({
    queryKey: ["all-achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").eq("is_active", true).order("category");
      return data ?? [];
    },
  });

  const addMeasurementMutation = useMutation({
    mutationFn: async (m: typeof measurement) => {
      const { error } = await supabase.from("body_measurements").insert([{
        member_id: user!.id,
        weight_kg: m.weight_kg ? +m.weight_kg : null,
        height_cm: m.height_cm ? +m.height_cm : null,
        body_fat_percentage: m.body_fat_percentage ? +m.body_fat_percentage : null,
        waist_cm: m.waist_cm ? +m.waist_cm : null,
        chest_cm: m.chest_cm ? +m.chest_cm : null,
        notes: m.notes,
        measured_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Measurements saved!" });
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      setShowAddMeasurement(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addGoalMutation = useMutation({
    mutationFn: async (g: typeof goal) => {
      const { error } = await supabase.from("fitness_goals").insert([{
        member_id: user!.id, title: g.title, goal_type: g.goal_type,
        target_value: g.target_value ? +g.target_value : null,
        unit: g.unit, target_date: g.target_date || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Goal set! 🎯" });
      queryClient.invalidateQueries({ queryKey: ["fitness-goals"] });
      setShowAddGoal(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      const { error } = await supabase.from("fitness_goals").update({ current_value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fitness-goals"] }),
  });

  const latest = measurements?.[0];
  const previous = measurements?.[1];

  const weightChange = latest?.weight_kg && previous?.weight_kg
    ? (latest.weight_kg - previous.weight_kg).toFixed(1)
    : null;

  const earnedIds = new Set((achievements ?? []).map((a: any) => a.achievement_id));

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="My Progress" subtitle="Track your fitness journey" />

      {/* Latest Stats */}
      {latest && (
        <div className="px-4 grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{latest.weight_kg ?? "–"}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
            {weightChange && (
              <p className={`text-[10px] font-medium flex items-center justify-center gap-0.5 mt-0.5 ${+weightChange < 0 ? "text-success" : "text-destructive"}`}>
                {+weightChange < 0 ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                {Math.abs(+weightChange)}kg
              </p>
            )}
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{latest.bmi ?? "–"}</p>
            <p className="text-[10px] text-muted-foreground">BMI</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{latest.body_fat_percentage ? `${latest.body_fat_percentage}%` : "–"}</p>
            <p className="text-[10px] text-muted-foreground">Body Fat</p>
          </CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto">
        {(["measurements", "goals", "achievements"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "achievements" ? `🏆 Badges` : tab === "goals" ? "🎯 Goals" : "📏 Measurements"}
          </button>
        ))}
      </div>

      {/* Measurements */}
      {activeTab === "measurements" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{(measurements ?? []).length} records</p>
            <Button size="sm" onClick={() => setShowAddMeasurement(true)}><Plus className="h-4 w-4 mr-1" /> Log</Button>
          </div>

          {showAddMeasurement && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base text-primary">Log Measurements</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Weight (kg)</label>
                    <Input type="number" step="0.1" value={measurement.weight_kg} onChange={e => setMeasurement(m => ({...m, weight_kg: e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Height (cm)</label>
                    <Input type="number" value={measurement.height_cm} onChange={e => setMeasurement(m => ({...m, height_cm: e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Body Fat %</label>
                    <Input type="number" step="0.1" value={measurement.body_fat_percentage} onChange={e => setMeasurement(m => ({...m, body_fat_percentage: e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Waist (cm)</label>
                    <Input type="number" value={measurement.waist_cm} onChange={e => setMeasurement(m => ({...m, waist_cm: e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => addMeasurementMutation.mutate(measurement)} disabled={addMeasurementMutation.isPending}>
                    {addMeasurementMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddMeasurement(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {measLoading ? <LoadingSpinner /> : (measurements ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No measurements logged yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(measurements ?? []).map((m, i) => (
                <Card key={m.id} className={i === 0 ? "border-primary/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-foreground">{format(new Date(m.measured_at), "MMM d, yyyy")}</p>
                      {i === 0 && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Latest</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {m.weight_kg && <div className="bg-muted rounded p-2 text-center"><p className="font-bold text-foreground">{m.weight_kg}kg</p><p className="text-muted-foreground">Weight</p></div>}
                      {m.bmi && <div className="bg-muted rounded p-2 text-center"><p className="font-bold text-foreground">{m.bmi}</p><p className="text-muted-foreground">BMI</p></div>}
                      {m.body_fat_percentage && <div className="bg-muted rounded p-2 text-center"><p className="font-bold text-foreground">{m.body_fat_percentage}%</p><p className="text-muted-foreground">Fat</p></div>}
                      {m.waist_cm && <div className="bg-muted rounded p-2 text-center"><p className="font-bold text-foreground">{m.waist_cm}cm</p><p className="text-muted-foreground">Waist</p></div>}
                      {m.chest_cm && <div className="bg-muted rounded p-2 text-center"><p className="font-bold text-foreground">{m.chest_cm}cm</p><p className="text-muted-foreground">Chest</p></div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goals */}
      {activeTab === "goals" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{(goals ?? []).filter(g => g.status === "active").length} active goals</p>
            <Button size="sm" onClick={() => setShowAddGoal(true)}><Plus className="h-4 w-4 mr-1" /> New Goal</Button>
          </div>

          {showAddGoal && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base text-primary">Set a Goal</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Goal title" value={goal.title} onChange={e => setGoal(g => ({...g, title: e.target.value}))} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select value={goal.goal_type} onChange={e => setGoal(g => ({...g, goal_type: e.target.value}))}
                      className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                      <option value="weight">Weight</option>
                      <option value="strength">Strength</option>
                      <option value="cardio">Cardio</option>
                      <option value="measurements">Measurements</option>
                      <option value="habit">Habit</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Target Date</label>
                    <Input type="date" value={goal.target_date} onChange={e => setGoal(g => ({...g, target_date: e.target.value}))} className="mt-1" />
                  </div>
                  <div><label className="text-xs text-muted-foreground">Target Value</label>
                    <Input type="number" value={goal.target_value} onChange={e => setGoal(g => ({...g, target_value: e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Unit</label>
                    <Input value={goal.unit} onChange={e => setGoal(g => ({...g, unit: e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => addGoalMutation.mutate(goal)} disabled={!goal.title || addGoalMutation.isPending}>
                    {addGoalMutation.isPending ? "Setting..." : "Set Goal"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {(goals ?? []).map(g => {
              const pct = g.target_value ? Math.min(((g.current_value ?? 0) / g.target_value) * 100, 100) : 0;
              return (
                <Card key={g.id} className={g.status === "achieved" ? "border-success/30 bg-success/5" : "hover:border-primary/30 transition-all"}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{g.title}</p>
                      <span className={`text-xs capitalize px-2 py-0.5 rounded-full font-medium ${
                        g.status === "achieved" ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                      }`}>{g.status}</span>
                    </div>
                    {g.target_value && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{g.current_value ?? 0} {g.unit}</span>
                          <span>Target: {g.target_value} {g.unit}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}
                    {g.target_date && (
                      <p className="text-xs text-muted-foreground">Target: {format(new Date(g.target_date), "MMM d, yyyy")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {(goals ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No goals set yet. Set your first fitness goal!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievements */}
      {activeTab === "achievements" && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-muted-foreground">{earnedIds.size} of {allAchievements?.length ?? 0} badges earned</p>
          <div className="grid grid-cols-2 gap-3">
            {(allAchievements ?? []).map(a => {
              const earned = earnedIds.has(a.id);
              return (
                <Card key={a.id} className={earned ? "border-primary/30" : "opacity-50"}>
                  <CardContent className="p-4 text-center">
                    <div className={`text-3xl mb-2 ${earned ? "" : "grayscale"}`}>{a.badge_icon}</div>
                    <p className={`text-sm font-semibold ${earned ? "text-foreground" : "text-muted-foreground"}`}>{a.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                    {earned && <p className="text-[10px] text-primary mt-1">✓ Earned</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
