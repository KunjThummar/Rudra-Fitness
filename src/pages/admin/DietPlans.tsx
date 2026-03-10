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
import { Salad, Plus, Search, Flame, Beef, Wheat, Droplets } from "lucide-react";

const GOAL_COLORS: Record<string, string> = {
  weight_loss: "bg-destructive/15 text-destructive border-destructive/30",
  muscle_gain: "bg-primary/15 text-primary border-primary/30",
  maintenance: "bg-success/15 text-success border-success/30",
  endurance: "bg-warning/15 text-warning border-warning/30",
  general: "bg-muted text-muted-foreground border-border",
};

export default function DietPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"plans" | "meals">("plans");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "", description: "", goal: "general",
    total_calories: 2000, protein_target_g: 150, carbs_target_g: 250, fat_target_g: 65,
    duration_weeks: 4,
  });
  const [newMeal, setNewMeal] = useState({
    name: "", description: "", category: "lunch",
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, serving_size: "1 serving",
  });

  const { data: dietPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["diet-plans-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (plan: typeof newPlan) => {
      const { error } = await supabase.from("diet_plans").insert([plan]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Diet plan created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["diet-plans-full"] });
      setShowAddPlan(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMealMutation = useMutation({
    mutationFn: async (meal: typeof newMeal) => {
      const { error } = await supabase.from("meals").insert([meal]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Meal created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      setShowAddMeal(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredPlans = (dietPlans ?? []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMeals = (meals ?? []).filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Diet Plans" subtitle="Manage nutrition plans and meal library" />

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {(["plans", "meals"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "plans" ? "Diet Plans" : "Meal Library"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
      </div>

      {/* Diet Plans Tab */}
      {activeTab === "plans" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{filteredPlans.length} plans</p>
            <Button size="sm" onClick={() => setShowAddPlan(true)}><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
          </div>

          {showAddPlan && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base text-primary">New Diet Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Plan name *" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} />
                <Input placeholder="Description" value={newPlan.description} onChange={e => setNewPlan(p => ({...p, description: e.target.value}))} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Goal</label>
                    <select value={newPlan.goal} onChange={e => setNewPlan(p => ({...p, goal: e.target.value}))}
                      className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground mt-1">
                      <option value="general">General</option>
                      <option value="weight_loss">Weight Loss</option>
                      <option value="muscle_gain">Muscle Gain</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="endurance">Endurance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (weeks)</label>
                    <Input type="number" min={1} value={newPlan.duration_weeks} onChange={e => setNewPlan(p => ({...p, duration_weeks: +e.target.value}))} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Total Calories</label>
                    <Input type="number" value={newPlan.total_calories} onChange={e => setNewPlan(p => ({...p, total_calories: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Protein (g)</label>
                    <Input type="number" value={newPlan.protein_target_g} onChange={e => setNewPlan(p => ({...p, protein_target_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Carbs (g)</label>
                    <Input type="number" value={newPlan.carbs_target_g} onChange={e => setNewPlan(p => ({...p, carbs_target_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Fat (g)</label>
                    <Input type="number" value={newPlan.fat_target_g} onChange={e => setNewPlan(p => ({...p, fat_target_g: +e.target.value}))} className="mt-1" /></div>
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

          {plansLoading ? <LoadingSpinner text="Loading plans..." /> : filteredPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Salad className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No diet plans yet.</p>
              <Button className="mt-3" onClick={() => setShowAddPlan(true)}>Create your first plan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map(plan => (
                <Card key={plan.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                      </div>
                      <Badge variant="outline" className={`text-xs capitalize ml-2 ${GOAL_COLORS[plan.goal ?? "general"]}`}>
                        {plan.goal?.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[
                        { icon: Flame, label: "kcal", value: plan.total_calories ?? plan.calories ?? "–" },
                        { icon: Beef, label: "protein", value: plan.protein_target_g ? `${plan.protein_target_g}g` : "–" },
                        { icon: Wheat, label: "carbs", value: plan.carbs_target_g ? `${plan.carbs_target_g}g` : "–" },
                        { icon: Droplets, label: "fat", value: plan.fat_target_g ? `${plan.fat_target_g}g` : "–" },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-muted rounded-lg p-2 text-center">
                          <Icon className="h-3 w-3 text-primary mx-auto mb-0.5" />
                          <p className="text-xs font-semibold text-foreground">{value}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meal Library Tab */}
      {activeTab === "meals" && (
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{filteredMeals.length} meals</p>
            <Button size="sm" onClick={() => setShowAddMeal(true)}><Plus className="h-4 w-4 mr-1" /> Add Meal</Button>
          </div>

          {showAddMeal && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base text-primary">New Meal / Recipe</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Meal name *" value={newMeal.name} onChange={e => setNewMeal(m => ({...m, name: e.target.value}))} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Category</label>
                    <select value={newMeal.category} onChange={e => setNewMeal(m => ({...m, category: e.target.value}))}
                      className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground mt-1">
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                      <option value="pre_workout">Pre-workout</option>
                      <option value="post_workout">Post-workout</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Serving Size</label>
                    <Input value={newMeal.serving_size} onChange={e => setNewMeal(m => ({...m, serving_size: e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Calories</label>
                    <Input type="number" value={newMeal.calories} onChange={e => setNewMeal(m => ({...m, calories: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Protein (g)</label>
                    <Input type="number" value={newMeal.protein_g} onChange={e => setNewMeal(m => ({...m, protein_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Carbs (g)</label>
                    <Input type="number" value={newMeal.carbs_g} onChange={e => setNewMeal(m => ({...m, carbs_g: +e.target.value}))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Fat (g)</label>
                    <Input type="number" value={newMeal.fat_g} onChange={e => setNewMeal(m => ({...m, fat_g: +e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => createMealMutation.mutate(newMeal)} disabled={!newMeal.name || createMealMutation.isPending}>
                    {createMealMutation.isPending ? "Adding..." : "Add Meal"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddMeal(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {mealsLoading ? <LoadingSpinner text="Loading meals..." /> : filteredMeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Salad className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No meals in library.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMeals.map(meal => (
                <Card key={meal.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{meal.name}</h3>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
                        {meal.category?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{meal.calories} kcal</span>
                      <span>P: {meal.protein_g}g</span>
                      <span>C: {meal.carbs_g}g</span>
                      <span>F: {meal.fat_g}g</span>
                      <span>· {meal.serving_size}</span>
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
