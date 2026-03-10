import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Camera, Save } from "lucide-react";

export default function MemberProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  // Effect to sync form data when profile loads
  const syncForm = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { error } = await supabase
        .from("profiles")
        .update(newData)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated! ✨" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading your profile..." />;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="My Profile" subtitle="Manage your personal information" />

      <div className="px-4 space-y-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-primary" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-background hover:bg-primary/90 transition-all">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Profile Details */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => { syncForm(); setIsEditing(true); }}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={() => updateProfileMutation.mutate(formData)} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{profile?.full_name || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{profile?.phone || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Email Address</p>
                    <p className="text-sm font-medium">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership Shortcut */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Save className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Active Membership</p>
                <p className="text-xs text-muted-foreground">Valid until July 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
