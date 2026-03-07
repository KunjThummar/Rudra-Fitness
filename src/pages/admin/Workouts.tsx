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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Dumbbell, Trash2 } from "lucide-react";

export default function WorkoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    level: "beginner",
  });

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["admin-workouts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", level: "beginner" });
    setEditingWorkout(null);
  };

  const openEdit = (workout: any) => {
    setEditingWorkout(workout);
    setForm({
      name: workout.name,
      description: workout.description || "",
      level: workout.level || "beginner",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingWorkout) {
        const { error } = await (supabase as any)
          .from("workouts")
          .update(data)
          .eq("id", editingWorkout.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("workouts").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingWorkout ? "Workout updated" : "Workout created" });
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Workout deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
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
        <LoadingSpinner size="lg" text="Loading workouts..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Workouts"
        subtitle="Manage library of workout plans"
        actionLabel="Create Workout"
        actionIcon={Plus}
        onAction={() => { resetForm(); setDialogOpen(true); }}
      />

      <div className="px-4 space-y-3">
        {workouts && workouts.length > 0 ? (
          workouts.map((workout: any) => (
            <Card key={workout.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground">{workout.name}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded capitalize bg-primary/10 text-primary">
                      {workout.level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{workout.description}</p>
                </div>
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(workout)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => { if(confirm("Are you sure?")) deleteMutation.mutate(workout.id) }}
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
            icon={Dumbbell}
            title="No workouts found"
            description="Create your first workout plan to assign to members"
            actionLabel="Create Workout"
            onAction={() => { resetForm(); setDialogOpen(true); }}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Workout Name *</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Full Body Strength"
              />
            </div>
            <div>
              <Label>Level</Label>
              <Select value={form.level} onValueChange={(val) => setForm({...form, level: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Describe sets, reps, rests..." 
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingWorkout ? "Update Workout" : "Create Workout"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
