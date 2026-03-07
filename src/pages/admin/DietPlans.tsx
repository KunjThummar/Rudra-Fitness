import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Salad, Plus, Edit, Trash2 } from "lucide-react";

export default function DietPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    calories: 2000,
  });

  const { data: dietPlans, isLoading } = useQuery({
    queryKey: ["admin-diet-plans"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("diet_plans")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", calories: 2000 });
    setEditingPlan(null);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      calories: plan.calories || 0,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingPlan) {
        const { error } = await (supabase as any)
          .from("diet_plans")
          .update(data)
          .eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("diet_plans").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingPlan ? "Diet Plan updated" : "Diet Plan created" });
      queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("diet_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Diet Plan deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading diet plans..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Diet Plans"
        subtitle="Manage diet templates"
        actionLabel="Create Plan"
        actionIcon={Plus}
        onAction={() => { resetForm(); setDialogOpen(true); }}
      />

      <div className="px-4 space-y-3">
        {dietPlans && dietPlans.length > 0 ? (
          dietPlans.map((plan: any) => (
            <Card key={plan.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded capitalize bg-emerald-500/10 text-emerald-600">
                      {plan.calories} kcal
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => { if(confirm("Are you sure?")) deleteMutation.mutate(plan.id) }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Salad}
            title="No diet plans found"
            description="Create your first diet plan to assign to members"
            actionLabel="Create Plan"
            onAction={() => { resetForm(); setDialogOpen(true); }}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Diet Plan" : "Create Diet Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Plan Name *</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Weight Loss Protocol"
              />
            </div>
            <div>
              <Label>Target Calories *</Label>
              <Input 
                type="number"
                value={form.calories} 
                onChange={e => setForm({...form, calories: Number(e.target.value)})} 
                placeholder="e.g. 2000"
              />
            </div>
            <div>
              <Label>Diet Details (Meals, Macros)</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Meal 1: Oats..." 
                rows={5}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
