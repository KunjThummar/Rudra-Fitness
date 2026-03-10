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
import { Dumbbell, Plus, Search, Filter, ChevronDown, Clock, Flame, Target } from "lucide-react";

const DIFFICULTY_COLORS = {
  beginner: "bg-success/15 text-success border-success/30",
  intermediate: "bg-warning/15 text-warning border-warning/30",
  advanced: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function WorkoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [activeTab, setActiveTab] = useState<"plans" | "exercises">("plans");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "", description: "", difficulty: "beginner", goal: "general",
    duration_weeks: 4, days_per_week: 3, estimated_duration_minutes: 60,
  });

  const { data: workoutPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*, exercise_categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (plan: typeof newPlan) => {
      const { error } = await supabase.from("workout_plans").insert([plan]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Workout plan created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      setShowAddPlan(false);
      setNewPlan({ name: "", description: "", difficulty: "beginner", goal: "general", duration_weeks: 4, days_per_week: 3, estimated_duration_minutes: 60 });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredPlans = (workoutPlans ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterDifficulty === "all" || p.difficulty === filterDifficulty)
  );

  const filteredExercises = (exercises ?? []).filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterDifficulty === "all" || e.difficulty === filterDifficulty)
  );

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Workouts" subtitle="Manage workout plans and exercise library" />

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["plans", "exercises"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "plans" ? "Workout Plans" : "Exercise Library"}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="px-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "plans" ? "Search plans..." : "Search exercises..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Workout Plans Tab */}
      {activeTab === "plans" && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredPlans.length} plans</p>
            <Button size="sm" onClick={() => setShowAddPlan(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Plan
            </Button>
          </div>

          {/* Add Plan Form */}
          {showAddPlan && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">New Workout Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Plan name *" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} />
                <Input placeholder="Description" value={newPlan.description} onChange={e => setNewPlan(p => ({...p, description: e.target.value}))} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newPlan.difficulty} onChange={e => setNewPlan(p => ({...p, difficulty: e.target.value}))}
                    className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select value={newPlan.goal} onChange={e => setNewPlan(p => ({...p, goal: e.target.value}))}
                    className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="general">General</option>
                    <option value="weight_loss">Weight Loss</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibility">Flexibility</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (weeks)</label>
                    <Input type="number" min={1} value={newPlan.duration_weeks} onChange={e => setNewPlan(p => ({...p, duration_weeks: +e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Days/Week</label>
                    <Input type="number" min={1} max={7} value={newPlan.days_per_week} onChange={e => setNewPlan(p => ({...p, days_per_week: +e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Min/Session</label>
                    <Input type="number" min={15} value={newPlan.estimated_duration_minutes} onChange={e => setNewPlan(p => ({...p, estimated_duration_minutes: +e.target.value}))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => createPlanMutation.mutate(newPlan)} disabled={!newPlan.name || createPlanMutation.isPending}>
                    {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddPlan(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {plansLoading ? (
            <LoadingSpinner text="Loading plans..." />
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No workout plans yet.</p>
              <Button className="mt-3" onClick={() => setShowAddPlan(true)}>Create your first plan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map(plan => (
                <Card key={plan.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                      </div>
                      <Badge variant="outline" className={`text-xs capitalize ml-2 ${DIFFICULTY_COLORS[plan.difficulty as keyof typeof DIFFICULTY_COLORS]}`}>
                        {plan.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Target className="h-3 w-3 text-primary" />{plan.goal?.replace("_", " ")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" />{plan.duration_weeks}w · {plan.days_per_week}d/wk</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-primary" />{plan.estimated_duration_minutes}min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exercise Library Tab */}
      {activeTab === "exercises" && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-muted-foreground">{filteredExercises.length} exercises</p>

          {exercisesLoading ? (
            <LoadingSpinner text="Loading exercises..." />
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No exercises found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map(ex => (
                <Card key={ex.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground">{ex.name}</h3>
                      <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[ex.difficulty as keyof typeof DIFFICULTY_COLORS]}`}>
                        {ex.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ex.exercise_categories && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{ex.exercise_categories.name}</span>
                      )}
                      {ex.muscle_groups?.map((mg: string) => (
                        <span key={mg} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{mg}</span>
                      ))}
                      {ex.equipment && ex.equipment !== "none" && (
                        <span className="text-xs text-muted-foreground">· {ex.equipment}</span>
                      )}
                    </div>
                    {ex.instructions && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ex.instructions}</p>
                    )}
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
