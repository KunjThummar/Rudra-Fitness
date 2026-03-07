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
import { Users, Plus, Edit, Trash2 } from "lucide-react";

export default function TrainersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  
  const [form, setForm] = useState({
    bio: "",
    specializations: "",
    experience_years: 0,
  });

  const { data: trainers, isLoading } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: async () => {
      // For trainers, since trainer_profiles references profiles
      // we need to join them to get the trainer info + their full_name
      // If the table doesn't exist yet, we catch the error gracefully
      try {
        const { data, error } = await (supabase as any)
          .from("trainer_profiles")
          .select("*, profiles:id(full_name, avatar_url)")
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        return data ?? [];
      } catch (err: any) {
        if (err?.code === '42P01') return []; // undefined table error
        throw err;
      }
    },
  });

  const resetForm = () => {
    setForm({ bio: "", specializations: "", experience_years: 0 });
    setEditingTrainer(null);
  };

  const openEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    setForm({
      bio: trainer.bio || "",
      specializations: (trainer.specializations || []).join(", "),
      experience_years: trainer.experience_years || 0,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        bio: data.bio,
        experience_years: data.experience_years,
        specializations: data.specializations.split(",").map(s => s.trim()).filter(Boolean),
      };

      if (editingTrainer) {
        const { error } = await (supabase as any)
          .from("trainer_profiles")
          .update(payload)
          .eq("id", editingTrainer.id);
        if (error) throw error;
      } else {
        // If creating a completely new trainer, we first need to create their supabase auth + profile.
        // For simplicity in this demo form, we're assuming the profile exists and we're just upgrading
        // someone to a trainer, or the form is incomplete. In a real app we'd need email + password.
        throw new Error("Creating a brand new trainer requires email and password. Use the Add Member flow and assign the 'trainer' role.");
      }
    },
    onSuccess: () => {
      toast({ title: editingTrainer ? "Trainer updated" : "Trainer created" });
      queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading trainers..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Trainers"
        subtitle="Manage gym trainers and coaches"
      />

      <div className="px-4 space-y-3">
        {trainers && trainers.length > 0 ? (
          trainers.map((trainer: any) => (
            <Card key={trainer.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {trainer.profiles?.full_name?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {trainer.profiles?.full_name || "Unknown Trainer"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {trainer.experience_years} years experience
                    </p>
                    {trainer.specializations && trainer.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {trainer.specializations.map((spec: string, i: number) => (
                          <span key={i} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(trainer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Users}
            title="No trainers found"
            description="Run the database migration to enable trainer features and assign the 'trainer' role to profiles."
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trainer Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Specializations (Comma separated)</Label>
              <Input 
                value={form.specializations} 
                onChange={e => setForm({...form, specializations: e.target.value})} 
                placeholder="e.g. Yoga, Powerlifting"
              />
            </div>
            <div>
              <Label>Years of Experience</Label>
              <Input 
                type="number"
                value={form.experience_years} 
                onChange={e => setForm({...form, experience_years: Number(e.target.value)})} 
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <Label>Bio / About</Label>
              <Textarea 
                value={form.bio} 
                onChange={e => setForm({...form, bio: e.target.value})}
                placeholder="Short bio about the trainer..." 
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Update Profile"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
