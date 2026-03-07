import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft } from "lucide-react";
import { z } from "zod";

const memberSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().max(20).optional(),
  plan_id: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export default function MemberForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    plan_id: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing member for editing
  const { data: existingMember, isLoading: loadingMember } = useQuery({
    queryKey: ["admin-member", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: isEditing,
  });

  // Load plans
  const { data: plans } = useQuery({
    queryKey: ["membership-plans-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_plans")
        .select("id, name, price, duration_months")
        .eq("is_active", true)
        .order("price");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (existingMember) {
      setForm((f) => ({
        ...f,
        full_name: existingMember.full_name || "",
        phone: existingMember.phone || "",
      }));
    }
  }, [existingMember]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name },
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Update phone if provided
      if (data.phone) {
        await supabase
          .from("profiles")
          .update({ phone: data.phone })
          .eq("id", authData.user.id);
      }

      // Create membership if plan selected
      if (data.plan_id) {
        const plan = plans?.find((p) => p.id === data.plan_id);
        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + plan.duration_months);

          await supabase.from("memberships").insert({
            user_id: authData.user.id,
            plan_id: plan.id,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            status: "active",
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Member created successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      navigate("/admin/members");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: data.full_name, phone: data.phone || null })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member", id] });
      navigate(`/admin/members/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const schema = isEditing
      ? memberSchema.omit({ email: true, password: true })
      : memberSchema.extend({ password: z.string().min(6, "Password must be at least 6 characters") });

    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (isEditing) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  if (isEditing && loadingMember) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading member..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title={isEditing ? "Edit Member" : "Add Member"}
        subtitle={isEditing ? "Update member information" : "Register a new gym member"}
      />

      <div className="px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className={errors.full_name ? "border-destructive" : ""}
                />
                {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
              </div>

              {!isEditing && (
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Enter email address"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              {!isEditing && (
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {!isEditing && plans && plans.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Membership Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={form.plan_id} onValueChange={(val) => setForm({ ...form, plan_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — ₹{Number(plan.price).toLocaleString()} / {plan.duration_months}mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <div className="px-0">
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Update Member" : "Add Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
