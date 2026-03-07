import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Dumbbell, Users, Check } from "lucide-react";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  description: z.string().trim().max(500).optional(),
  duration_months: z.number().int().min(1).max(36),
  price: z.number().positive("Price must be positive"),
  features: z.array(z.string()).optional(),
  is_active: z.boolean(),
});

type PlanForm = z.infer<typeof planSchema>;

export default function MembershipPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState<PlanForm>({
    name: "",
    description: "",
    duration_months: 1,
    price: 0,
    features: [],
    is_active: true,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-membership-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_plans")
        .select("*")
        .order("price");
      return data ?? [];
    },
  });

  // Get member counts per plan
  const { data: planCounts } = useQuery({
    queryKey: ["admin-plan-member-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("plan_id")
        .eq("status", "active");

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.plan_id] = (counts[m.plan_id] || 0) + 1;
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const payload = {
        name: data.name,
        description: data.description || "",
        duration_months: data.duration_months,
        price: data.price,
        features: data.features ?? [],
        is_active: data.is_active,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("membership_plans")
          .update(payload)
          .eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("membership_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingPlan ? "Plan updated" : "Plan created" });
      queryClient.invalidateQueries({ queryKey: ["admin-membership-plans"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", duration_months: 1, price: 0, features: [], is_active: true });
    setFeatureInput("");
    setEditingPlan(null);
    setErrors({});
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      duration_months: plan.duration_months,
      price: Number(plan.price),
      features: Array.isArray(plan.features) ? plan.features : [],
      is_active: plan.is_active,
    });
    setDialogOpen(true);
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...(form.features ?? []), featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features?.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = planSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading plans..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Membership Plans"
        subtitle={`${plans?.length ?? 0} plans`}
        actionLabel="Add Plan"
        actionIcon={Plus}
        onAction={() => { resetForm(); setDialogOpen(true); }}
      />

      <div className="px-4 space-y-3">
        {plans && plans.length > 0 ? (
          plans.map((plan: any) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                      {!plan.is_active && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-primary mt-1">
                      ₹{Number(plan.price).toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground"> / {plan.duration_months} month{plan.duration_months > 1 ? "s" : ""}</span>
                    </p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    )}
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(plan.features as string[]).map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {planCounts?.[plan.id] || 0} active members
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No plans created"
            description="Create your first membership plan to start assigning members"
            actionLabel="Add Plan"
            onAction={() => { resetForm(); setDialogOpen(true); }}
          />
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plan-name">Plan Name *</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Monthly Basic"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea
                id="plan-desc"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what's included"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-price">Price (₹) *</Label>
                <Input
                  id="plan-price"
                  type="number"
                  value={form.price || ""}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className={errors.price ? "border-destructive" : ""}
                />
                {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
              </div>
              <div>
                <Label htmlFor="plan-duration">Duration (months) *</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  max={36}
                  value={form.duration_months}
                  onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="e.g. Access to all equipment"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  Add
                </Button>
              </div>
              {form.features && form.features.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-success" />
                      <span className="flex-1">{f}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(i)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="plan-active">Active</Label>
              <Switch
                id="plan-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <LoadingSpinner size="sm" /> : editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
