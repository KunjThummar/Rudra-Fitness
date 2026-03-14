import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Phone, Calendar, CreditCard, UserX, Dumbbell, Salad, Plus } from "lucide-react";
import { format } from "date-fns";

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState("");
  const [selectedDietPlan, setSelectedDietPlan] = useState("");

  const { data: member, isLoading } = useQuery({
    queryKey: ["admin-member", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: memberships } = useQuery({
    queryKey: ["admin-member-memberships", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("*, membership_plans(name, price, duration_months)")
        .eq("user_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-member-payments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: attendance } = useQuery({
    queryKey: ["admin-member-attendance", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", id!)
        .order("check_in", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: memberWorkouts } = useQuery({
    queryKey: ["admin-member-workouts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_workouts")
        .select("*, workout_plans(name, difficulty)")
        .eq("member_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: memberDietPlans } = useQuery({
    queryKey: ["admin-member-diet-plans", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_diet_plans")
        .select("*, diet_plans(name, goal)")
        .eq("member_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: allWorkoutPlans } = useQuery({
    queryKey: ["all-workout-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("workout_plans").select("id, name").eq("is_active", true);
      return data ?? [];
    }
  });

  const { data: allDietPlans } = useQuery({
    queryKey: ["all-diet-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("diet_plans").select("id, name").eq("is_active", true);
      return data ?? [];
    }
  });

  const assignWorkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from("member_workouts").insert([{ member_id: id, workout_plan_id: planId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Workout plan assigned" });
      setSelectedWorkoutPlan("");
      queryClient.invalidateQueries({ queryKey: ["admin-member-workouts", id] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignDietMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from("member_diet_plans").insert([{ member_id: id, diet_plan_id: planId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Diet plan assigned" });
      setSelectedDietPlan("");
      queryClient.invalidateQueries({ queryKey: ["admin-member-diet-plans", id] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const activeMembership = memberships?.find((m) => m.status === "active");
      if (!activeMembership) throw new Error("No active membership to suspend");
      const { error } = await supabase
        .from("memberships")
        .update({ status: "suspended" })
        .eq("id", activeMembership.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Membership suspended" });
      queryClient.invalidateQueries({ queryKey: ["admin-member-memberships", id] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activeMembership = memberships?.find((m) => m.status === "active");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Member not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/members")}>
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="px-4 pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/members")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Profile Header */}
      <div className="px-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                {member.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">{member.full_name || "Unnamed"}</h2>
                {member.phone && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  Member since {format(new Date(member.created_at), "MMM d, yyyy")}
                </p>
                <div className="mt-2">
                  {activeMembership ? (
                    <StatusBadge status="active" />
                  ) : (
                    <StatusBadge status="inactive" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => navigate(`/admin/members/${id}/edit`)}>
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              {activeMembership && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => suspendMutation.mutate()}
                  disabled={suspendMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5" />
                  Suspend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="membership" className="space-y-3">
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="membership" className="flex-1 min-w-[100px]">Membership</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 min-w-[100px]">Payments</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 min-w-[100px]">Attendance</TabsTrigger>
            <TabsTrigger value="workouts" className="flex-1 min-w-[100px]">Workouts</TabsTrigger>
            <TabsTrigger value="diet" className="flex-1 min-w-[100px]">Diet</TabsTrigger>
          </TabsList>

          <TabsContent value="membership">
            {memberships && memberships.length > 0 ? (
              <div className="space-y-2">
                {memberships.map((m: any) => (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {m.membership_plans?.name || "Unknown Plan"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(m.start_date), "MMM d, yyyy")} — {format(new Date(m.end_date), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{Number(m.membership_plans?.price ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={m.status as "active" | "expired" | "inactive"} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No memberships assigned</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payments">
            {payments && payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">₹{Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(p.created_at), "MMM d, yyyy")} · {p.payment_method}
                        </p>
                      </div>
                      <StatusBadge status={p.status as "paid" | "pending" | "overdue"} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No payment records</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {attendance && attendance.length > 0 ? (
              <div className="space-y-2">
                {attendance.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(a.check_in), "EEEE, MMM d")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          In: {format(new Date(a.check_in), "h:mm a")}
                          {a.check_out && ` · Out: ${format(new Date(a.check_out), "h:mm a")}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No attendance records</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="workouts">
            <Card className="mb-4">
              <CardContent className="p-4 flex gap-2">
                <select
                  className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={selectedWorkoutPlan}
                  onChange={(e) => setSelectedWorkoutPlan(e.target.value)}
                >
                  <option value="">Select a workout plan to assign...</option>
                  {allWorkoutPlans?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button 
                  onClick={() => assignWorkoutMutation.mutate(selectedWorkoutPlan)} 
                  disabled={!selectedWorkoutPlan || assignWorkoutMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> Assign
                </Button>
              </CardContent>
            </Card>
            {memberWorkouts && memberWorkouts.length > 0 ? (
              <div className="space-y-2">
                {memberWorkouts.map((w: any) => (
                  <Card key={w.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{w.workout_plans?.name || "Unknown Plan"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Assigned: {format(new Date(w.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <StatusBadge status={w.status as "active" | "inactive"} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="p-6 text-center"><Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No workout plans assigned</p></CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="diet">
            <Card className="mb-4">
              <CardContent className="p-4 flex gap-2">
                <select
                  className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={selectedDietPlan}
                  onChange={(e) => setSelectedDietPlan(e.target.value)}
                >
                  <option value="">Select a diet plan to assign...</option>
                  {allDietPlans?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button 
                  onClick={() => assignDietMutation.mutate(selectedDietPlan)} 
                  disabled={!selectedDietPlan || assignDietMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> Assign
                </Button>
              </CardContent>
            </Card>
            {memberDietPlans && memberDietPlans.length > 0 ? (
              <div className="space-y-2">
                {memberDietPlans.map((d: any) => (
                  <Card key={d.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.diet_plans?.name || "Unknown Plan"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Assigned: {format(new Date(d.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <StatusBadge status={d.status as "active" | "inactive"} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="p-6 text-center"><Salad className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No diet plans assigned</p></CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
