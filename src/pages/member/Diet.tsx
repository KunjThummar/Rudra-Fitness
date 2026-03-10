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
import { Salad, Plus, Flame, Beef, Wheat, Droplets, BookOpen } from "lucide-react";
import { format } from "date-fns";

export default function MemberDietPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"plan" | "log">("plan");
  const [showLogForm, setShowLogForm] = useState(false);
  const [today] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newLog, setNewLog] = useState({
    food_name: "", meal_time: "breakfast", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
  });

  const { data: assignedDiet, isLoading } = useQuery({
    queryKey: ["member-diet-plan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_diet_plans")
        .select("*, diet_plans(name, description, goal, total_calories, protein_target_g, carbs_target_g, fat_target_g, duration_weeks)")
        .eq("member_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
    enabled: !!user,
  });

  const { data: todayLogs } = useQuery({
    queryKey: ["nutrition-logs-today", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("member_id", user!.id)
        .gte("logged_at", today + "T00:00:00")
        .lte("logged_at", today + "T23:59:59")
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const logMealMutation = useMutation({
    mutationFn: async (entry: typeof newLog) => {
      const { error } = await supabase.from("nutrition_logs").insert([{
        ...entry, member_id: user!.id, logged_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Meal logged! 🥗" });
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs-today"] });
      setShowLogForm(false);
      setNewLog({ food_name: "", meal_time: "breakfast", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const plan = assignedDiet?.diet_plans;
  const todayCalories = (todayLogs ?? []).reduce((s, l) => s + (l.calories ?? 0), 0);
  const todayProtein = (todayLogs ?? []).reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const todayCarbs = (todayLogs ?? []).reduce((s, l) => s + (l.carbs_g ?? 0), 0);
  const todayFat = (todayLogs ?? []).reduce((s, l) => s + (l.fat_g ?? 0), 0);

  const calTarget = plan?.total_calories ?? 2000;
  const proteinTarget = plan?.protein_target_g ?? 150;
  const carbsTarget = plan?.carbs_target_g ?? 250;
  const fatTarget = plan?.fat_target_g ?? 65;

  const MEAL_TIMES = ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"];

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="My Diet" subtitle="Track your nutrition and assigned meal plan" />

      {/* Today's Macros */}
      <div className="px-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-foreground">Today's Nutrition</p>
              <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{todayCalories}</p>
                <p className="text-xs text-muted-foreground">of {calTarget} kcal</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "P", value: todayProtein, target: proteinTarget, color: "text-primary" },
                  { label: "C", value: todayCarbs, target: carbsTarget, color: "text-warning" },
                  { label: "F", value: todayFat, target: fatTarget, color: "text-success" },
                ].map(({ label, value, target, color }) => (
                  <div key={label}>
                    <p className={`text-sm font-bold ${color}`}>{Math.round(value)}g</p>
                    <p className="text-[10px] text-muted-foreground">{label} / {target}g</p>
                  </div>
                ))}
              </div>
            </div>
            <Progress value={Math.min((todayCalories / calTarget) * 100, 100)} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["plan", "log"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "plan" ? "My Plan" : "Food Log"}
          </button>
        ))}
      </div>

      {/* Plan Tab */}
      {activeTab === "plan" && (
        <div className="px-4 space-y-3">
          {isLoading ? <LoadingSpinner text="Loading your plan..." /> : !plan ? (
            <div className="text-center py-12 text-muted-foreground">
              <Salad className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No diet plan assigned yet</p>
              <p className="text-sm mt-1">Ask your trainer to assign a nutrition plan.</p>
            </div>
          ) : (
            <Card className="hover:border-primary/30 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
                    {plan.goal?.replace("_", " ")}
                  </span>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                <p className="text-xs text-muted-foreground">{plan.duration_weeks} weeks plan</p>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { icon: Flame, label: "kcal", value: plan.total_calories, color: "text-orange-400" },
                    { icon: Beef, label: "protein", value: `${plan.protein_target_g}g`, color: "text-primary" },
                    { icon: Wheat, label: "carbs", value: `${plan.carbs_target_g}g`, color: "text-warning" },
                    { icon: Droplets, label: "fat", value: `${plan.fat_target_g}g`, color: "text-success" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-muted rounded-lg p-2 text-center">
                      <Icon className={`h-3 w-3 ${color} mx-auto mb-0.5`} />
                      <p className="text-xs font-semibold text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Food Log Tab */}
      {activeTab === "log" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{(todayLogs ?? []).length} meals logged today</p>
            <Button size="sm" onClick={() => setShowLogForm(true)}><Plus className="h-4 w-4 mr-1" /> Log Meal</Button>
          </div>

          {showLogForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base text-primary">Log a Meal</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Food / Meal name *" value={newLog.food_name} onChange={e => setNewLog(l => ({...l, food_name: e.target.value}))} />
                <div>
                  <label className="text-xs text-muted-foreground">Meal Time</label>
                  <select value={newLog.meal_time} onChange={e => setNewLog(l => ({...l, meal_time: e.target.value}))}
                    className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    {MEAL_TIMES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Calories</label>
                    <Input type="number" value={newLog.calories} onChange={e => setNewLog(l => ({...l, calories: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Protein (g)</label>
                    <Input type="number" value={newLog.protein_g} onChange={e => setNewLog(l => ({...l, protein_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Carbs (g)</label>
                    <Input type="number" value={newLog.carbs_g} onChange={e => setNewLog(l => ({...l, carbs_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Fat (g)</label>
                    <Input type="number" value={newLog.fat_g} onChange={e => setNewLog(l => ({...l, fat_g: +e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => logMealMutation.mutate(newLog)} disabled={!newLog.food_name || logMealMutation.isPending}>
                    {logMealMutation.isPending ? "Logging..." : "Log Meal"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(todayLogs ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No meals logged today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(todayLogs ?? []).map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Salad className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{log.meal_time?.replace("_", " ")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{log.calories} kcal</p>
                      <p className="text-[10px] text-muted-foreground">P:{Math.round(log.protein_g ?? 0)} C:{Math.round(log.carbs_g ?? 0)} F:{Math.round(log.fat_g ?? 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
