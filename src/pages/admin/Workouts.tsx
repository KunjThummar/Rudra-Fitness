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
import { Dumbbell, Plus, Search, Filter, ChevronDown, Clock, Flame, Target, Edit, Trash2, ChevronRight, Copy, X } from "lucide-react";

const DIFFICULTY_COLORS = {
  beginner: "bg-success/15 text-success border-success/30",
  intermediate: "bg-warning/15 text-warning border-warning/30",
  advanced: "bg-destructive/15 text-destructive border-destructive/30",
};

const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Abs", "Obliques", "Quads", "Hamstrings", "Glutes", "Calves",
];

const EQUIPMENT_OPTIONS = [
  "none", "barbell", "dumbbell", "kettlebell", "cable", "machine",
  "resistance-band", "pull-up-bar", "bench", "rack", "smith-machine"
];

export default function WorkoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [activeTab, setActiveTab] = useState<"plans" | "exercises">("plans");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string | null>(null);
  const [showAssignExercise, setShowAssignExercise] = useState(false);
  
  const [newPlan, setNewPlan] = useState({
    name: "", description: "", difficulty: "beginner", goal: "general",
    duration_weeks: 4, days_per_week: 3, estimated_duration_minutes: 60,
  });
  
  const [newExercise, setNewExercise] = useState({
    name: "", description: "", category_id: "", difficulty: "beginner",
    muscle_groups: [] as string[], equipment: "none", instructions: "",
  });

  const [exerciseAssignment, setExerciseAssignment] = useState({
    exercise_id: "", day_number: 1, order_index: 1, sets: 3, reps: "10", rest_seconds: 60, notes: "",
  });

  // Queries
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

  const { data: categories } = useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: planExercises } = useQuery({
    queryKey: ["plan-exercises", selectedPlan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plan_exercises")
        .select("*, exercises(name, difficulty)")
        .eq("workout_plan_id", selectedPlan!)
        .order("day_number, order_index");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedPlan,
  });

  // Mutations
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

  const createExerciseMutation = useMutation({
    mutationFn: async (exercise: typeof newExercise) => {
      if (!exercise.name) throw new Error("Exercise name is required");
      const { error } = await supabase.from("exercises").insert([{
        ...exercise,
        is_active: true,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exercise created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setShowAddExercise(false);
      setNewExercise({ name: "", description: "", category_id: "", difficulty: "beginner", muscle_groups: [], equipment: "none", instructions: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase
        .from("exercises")
        .update({ is_active: false })
        .eq("id", exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exercise deleted!" });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan deleted!" });
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignExerciseMutation = useMutation({
    mutationFn: async (data: typeof exerciseAssignment & { workout_plan_id: string }) => {
      const { error } = await supabase
        .from("workout_plan_exercises")
        .insert([{
          ...data,
          workout_plan_id: data.workout_plan_id,
          exercise_id: data.exercise_id,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exercise assigned to plan!" });
      queryClient.invalidateQueries({ queryKey: ["plan-exercises", selectedPlan] });
      setShowAssignExercise(false);
      setExerciseAssignment({ exercise_id: "", day_number: 1, order_index: 1, sets: 3, reps: "10", rest_seconds: 60, notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeExerciseFromPlanMutation = useMutation({
    mutationFn: async (planExerciseId: string) => {
      const { error } = await supabase
        .from("workout_plan_exercises")
        .delete()
        .eq("id", planExerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exercise removed from plan" });
      queryClient.invalidateQueries({ queryKey: ["plan-exercises", selectedPlan] });
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

  const selectedPlanData = workoutPlans?.find(p => p.id === selectedPlan);

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Workouts" subtitle="Manage workout plans and exercise library" />

      {/* Show Plan Detail View */}
      {showPlanDetail && selectedPlan && selectedPlanData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{selectedPlanData.name}</h2>
              <button onClick={() => { setShowPlanDetail(false); setSelectedPlan(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-2">PLAN DETAILS</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty:</span>
                    <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[selectedPlanData.difficulty as keyof typeof DIFFICULTY_COLORS]}`}>
                      {selectedPlanData.difficulty}
                    </Badge>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Goal:</span><span className="font-medium">{selectedPlanData.goal?.replace("_", " ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration:</span><span className="font-medium">{selectedPlanData.duration_weeks} weeks</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Frequency:</span><span className="font-medium">{selectedPlanData.days_per_week}x per week</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Session Duration:</span><span className="font-medium">{selectedPlanData.estimated_duration_minutes} min</span></div>
                </div>
                {selectedPlanData.description && (
                  <p className="text-sm text-muted-foreground mt-3">{selectedPlanData.description}</p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-semibold">EXERCISES ({(planExercises ?? []).length})</p>
                  <Button size="sm" onClick={() => setShowAssignExercise(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Exercise
                  </Button>
                </div>

                {showAssignExercise && (
                  <Card className="border-primary/30 bg-primary/5 mb-4">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground font-semibold">Exercise *</label>
                        <select
                          value={exerciseAssignment.exercise_id}
                          onChange={(e) => setExerciseAssignment(a => ({ ...a, exercise_id: e.target.value }))}
                          className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground mt-1"
                        >
                          <option value="">Select an exercise...</option>
                          {(exercises ?? []).map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Day *</label>
                          <Input type="number" min={1} max={7} value={exerciseAssignment.day_number} onChange={(e) => setExerciseAssignment(a => ({ ...a, day_number: +e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Order *</label>
                          <Input type="number" min={0} value={exerciseAssignment.order_index} onChange={(e) => setExerciseAssignment(a => ({ ...a, order_index: +e.target.value }))} className="mt-1" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Sets</label>
                          <Input type="number" min={1} value={exerciseAssignment.sets} onChange={(e) => setExerciseAssignment(a => ({ ...a, sets: +e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <Input placeholder="10 or 8-12" value={exerciseAssignment.reps} onChange={(e) => setExerciseAssignment(a => ({ ...a, reps: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Rest (sec)</label>
                          <Input type="number" value={exerciseAssignment.rest_seconds} onChange={(e) => setExerciseAssignment(a => ({ ...a, rest_seconds: +e.target.value }))} className="mt-1" />
                        </div>
                      </div>

                      <Input placeholder="Notes (optional)" value={exerciseAssignment.notes} onChange={(e) => setExerciseAssignment(a => ({ ...a, notes: e.target.value }))} />

                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => assignExerciseMutation.mutate({ ...exerciseAssignment, workout_plan_id: selectedPlan })} disabled={!exerciseAssignment.exercise_id || assignExerciseMutation.isPending}>
                          {assignExerciseMutation.isPending ? "Adding..." : "Add to Plan"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowAssignExercise(false)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(planExercises ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No exercises assigned yet. Add one to get started!</p>
                ) : (
                  <div className="space-y-2">
                    {planExercises?.map((pe) => (
                      <Card key={pe.id} className="hover:border-primary/30">
                        <CardContent className="p-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs shrink-0">Day {pe.day_number}</Badge>
                              <h4 className="font-semibold text-foreground text-sm truncate">{pe.exercises?.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              <span>Order: {pe.order_index}</span>
                              <span>•</span>
                              <span>{pe.sets}x{pe.reps}</span>
                              <span>•</span>
                              <span>{pe.rest_seconds}s rest</span>
                            </div>
                            {pe.notes && <p className="text-xs text-muted-foreground mt-1">{pe.notes}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExerciseFromPlanMutation.mutate(pe.id)}
                            disabled={removeExerciseFromPlanMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Target className="h-3 w-3 text-primary" />{plan.goal?.replace("_", " ")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" />{plan.duration_weeks}w · {plan.days_per_week}d/wk</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-primary" />{plan.estimated_duration_minutes}min</span>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 text-xs" onClick={() => { setSelectedPlan(plan.id); setShowPlanDetail(true); }}>
                        <ChevronRight className="h-3 w-3 mr-1" /> View Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deletePlanMutation.mutate(plan.id)} disabled={deletePlanMutation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredExercises.length} exercises</p>
            <Button size="sm" onClick={() => setShowAddExercise(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Exercise
            </Button>
          </div>

          {/* Add Exercise Form */}
          {showAddExercise && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">New Exercise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Exercise name *" value={newExercise.name} onChange={e => setNewExercise(ex => ({...ex, name: e.target.value}))} />
                <Input placeholder="Description" value={newExercise.description} onChange={e => setNewExercise(ex => ({...ex, description: e.target.value}))} />
                
                <div className="grid grid-cols-2 gap-2">
                  <select value={newExercise.difficulty} onChange={e => setNewExercise(ex => ({...ex, difficulty: e.target.value}))}
                    className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select value={newExercise.category_id} onChange={e => setNewExercise(ex => ({...ex, category_id: e.target.value}))}
                    className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="">Select category...</option>
                    {(categories ?? []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <select value={newExercise.equipment} onChange={e => setNewExercise(ex => ({...ex, equipment: e.target.value}))}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                  {EQUIPMENT_OPTIONS.map(eq => (
                    <option key={eq} value={eq}>{eq.replace("-", " ").toUpperCase()}</option>
                  ))}
                </select>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-2 block">Muscle Groups</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {MUSCLE_GROUPS.map(mg => (
                      <label key={mg} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExercise.muscle_groups.includes(mg)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewExercise(ex => ({...ex, muscle_groups: [...ex.muscle_groups, mg]}));
                            } else {
                              setNewExercise(ex => ({...ex, muscle_groups: ex.muscle_groups.filter(m => m !== mg)}));
                            }
                          }}
                          className="rounded"
                        />
                        {mg}
                      </label>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Instructions (how to perform the exercise)"
                  value={newExercise.instructions}
                  onChange={e => setNewExercise(ex => ({...ex, instructions: e.target.value}))}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground min-h-20 resize-none"
                />

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => createExerciseMutation.mutate(newExercise)} disabled={!newExercise.name || createExerciseMutation.isPending}>
                    {createExerciseMutation.isPending ? "Creating..." : "Create Exercise"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddExercise(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {exercisesLoading ? (
            <LoadingSpinner text="Loading exercises..." />
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No exercises found.</p>
              <Button className="mt-3" onClick={() => setShowAddExercise(true)}>Create your first exercise</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map(ex => (
                <Card key={ex.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{ex.name}</h3>
                          <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[ex.difficulty as keyof typeof DIFFICULTY_COLORS]}`}>
                            {ex.difficulty}
                          </Badge>
                        </div>
                        {ex.description && <p className="text-xs text-muted-foreground">{ex.description}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExerciseMutation.mutate(ex.id)}
                        disabled={deleteExerciseMutation.isPending}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ex.exercise_categories && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{ex.exercise_categories.name}</span>
                      )}
                      {ex.muscle_groups?.map((mg: string) => (
                        <span key={mg} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{mg}</span>
                      ))}
                      {ex.equipment && ex.equipment !== "none" && (
                        <span className="text-xs text-muted-foreground">• {ex.equipment}</span>
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
