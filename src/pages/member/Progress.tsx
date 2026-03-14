import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Target, Award, Scale, ChevronUp, ChevronDown, Minus, Camera, Upload, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MemberProgressPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"measurements" | "goals" | "photos" | "achievements">("measurements");
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showUploadPhoto, setShowUploadPhoto] = useState(false);
  const [selectedPhotoAngle, setSelectedPhotoAngle] = useState<"front" | "back" | "side_left" | "side_right">("front");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [measurement, setMeasurement] = useState({
    weight_kg: "", height_cm: "", body_fat_percentage: "", waist_cm: "", chest_cm: "", hips_cm: "", left_arm_cm: "", right_arm_cm: "", notes: "",
  });
  
  const [goal, setGoal] = useState({
    title: "", goal_type: "weight", target_value: "", current_value: "", unit: "kg", target_date: "", notes: "",
  });

  // Queries
  const { data: measurements, isLoading: measLoading } = useQuery({
    queryKey: ["body-measurements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("member_id", user!.id)
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: progressPhotos } = useQuery({
    queryKey: ["progress-photos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("member_id", user!.id)
        .eq("is_private", false)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ["fitness-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("member_id", user!.id)
        .order("target_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: achievements } = useQuery({
    queryKey: ["member-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_achievements")
        .select("*, achievements(name, description, badge_icon, badge_color, category)")
        .eq("member_id", user!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: allAchievements } = useQuery({
    queryKey: ["all-achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").eq("is_active", true).order("category");
      return data ?? [];
    },
  });

  // Mutations
  const addMeasurementMutation = useMutation({
    mutationFn: async (m: typeof measurement) => {
      if (!m.weight_kg) throw new Error("Weight is required");
      const { error } = await supabase.from("body_measurements").insert([{
        member_id: user!.id,
        weight_kg: m.weight_kg ? +m.weight_kg : null,
        height_cm: m.height_cm ? +m.height_cm : null,
        body_fat_percentage: m.body_fat_percentage ? +m.body_fat_percentage : null,
        waist_cm: m.waist_cm ? +m.waist_cm : null,
        chest_cm: m.chest_cm ? +m.chest_cm : null,
        hips_cm: m.hips_cm ? +m.hips_cm : null,
        left_arm_cm: m.left_arm_cm ? +m.left_arm_cm : null,
        right_arm_cm: m.right_arm_cm ? +m.right_arm_cm : null,
        notes: m.notes,
        measured_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Measurements saved! 📏" });
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      setShowAddMeasurement(false);
      setMeasurement({ weight_kg: "", height_cm: "", body_fat_percentage: "", waist_cm: "", chest_cm: "", hips_cm: "", left_arm_cm: "", right_arm_cm: "", notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addGoalMutation = useMutation({
    mutationFn: async (g: typeof goal) => {
      if (!g.title || !g.target_value) throw new Error("Title and target value required");
      const { error } = await supabase.from("fitness_goals").insert([{
        member_id: user!.id,
        title: g.title,
        goal_type: g.goal_type,
        target_value: +g.target_value,
        current_value: g.current_value ? +g.current_value : 0,
        unit: g.unit,
        target_date: g.target_date,
        notes: g.notes,
        status: "active",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Goal created! 🎯" });
      queryClient.invalidateQueries({ queryKey: ["fitness-goals"] });
      setShowAddGoal(false);
      setGoal({ title: "", goal_type: "weight", target_value: "", current_value: "", unit: "kg", target_date: "", notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!file) throw new Error("File is required");
      
      const fileName = `${user!.id}/${selectedPhotoAngle}/${Date.now()}-${file.name}`;
      const { error: uploadError, data } = await supabase.storage
        .from("progress-photos")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("progress-photos")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("progress_photos")
        .insert([{
          member_id: user!.id,
          photo_url: publicUrl,
          storage_path: fileName,
          view_angle: selectedPhotoAngle,
          taken_at: new Date().toISOString(),
          is_private: false,
        }]);
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({ title: "Photo uploaded! 📷" });
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
      setShowUploadPhoto(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const photo = progressPhotos?.find(p => p.id === photoId);
      if (!photo) throw new Error("Photo not found");

      const { error: deleteError } = await supabase.storage
        .from("progress-photos")
        .remove([photo.storage_path]);

      if (deleteError) throw deleteError;

      const { error } = await supabase
        .from("progress_photos")
        .delete()
        .eq("id", photoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Photo deleted" });
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculations
  const latestMeasurement = measurements?.[0];
  const previousMeasurement = measurements?.[1];
  
  const weightChange = latestMeasurement && previousMeasurement 
    ? (latestMeasurement.weight_kg || 0) - (previousMeasurement.weight_kg || 0)
    : null;

  const earnedAchievements = achievements || [];
  const unlockedAchievements = new Set(earnedAchievements.map(a => a.achievement_id));

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="My Progress" subtitle="Track your fitness journey with measurements and achievements" />

      {/* Stats Overview */}
      <div className="px-4 grid grid-cols-3 gap-2">
        {latestMeasurement && (
          <>
            <Card>
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-primary">{latestMeasurement.weight_kg}kg</p>
                <p className="text-[10px] text-muted-foreground">Current Weight</p>
                {weightChange !== null && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${weightChange < 0 ? "text-success" : "text-destructive"}`}>
                    {weightChange < 0 ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    {Math.abs(weightChange).toFixed(1)}kg
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-primary">{latestMeasurement.waist_cm || "-"}cm</p>
                <p className="text-[10px] text-muted-foreground">Waist</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-primary">{latestMeasurement.body_fat_percentage || "-"}%</p>
                <p className="text-[10px] text-muted-foreground">Body Fat</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-1 overflow-x-auto">
        {(["measurements", "photos", "goals", "achievements"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "measurements" ? "📏 Measurements" : tab === "photos" ? "📷 Photos" : tab === "goals" ? "🎯 Goals" : "🏆 Achievements"}
          </button>
        ))}
      </div>

      {/* Measurements Tab */}
      {activeTab === "measurements" && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{measurements?.length ?? 0} entries</p>
            <Button size="sm" onClick={() => setShowAddMeasurement(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log Measurements
            </Button>
          </div>

          {showAddMeasurement && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Log Body Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Weight (kg) *</label>
                    <Input type="number" step="0.1" placeholder="e.g., 75.5" value={measurement.weight_kg} onChange={(e) => setMeasurement(m => ({...m, weight_kg: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Height (cm)</label>
                    <Input type="number" placeholder="e.g., 180" value={measurement.height_cm} onChange={(e) => setMeasurement(m => ({...m, height_cm: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Body Fat %</label>
                    <Input type="number" step="0.1" placeholder="e.g., 20" value={measurement.body_fat_percentage} onChange={(e) => setMeasurement(m => ({...m, body_fat_percentage: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Waist (cm)</label>
                    <Input type="number" placeholder="e.g., 85" value={measurement.waist_cm} onChange={(e) => setMeasurement(m => ({...m, waist_cm: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Chest (cm)</label>
                    <Input type="number" placeholder="e.g., 100" value={measurement.chest_cm} onChange={(e) => setMeasurement(m => ({...m, chest_cm: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hips (cm)</label>
                    <Input type="number" placeholder="e.g., 95" value={measurement.hips_cm} onChange={(e) => setMeasurement(m => ({...m, hips_cm: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Left Arm (cm)</label>
                    <Input type="number" placeholder="e.g., 32" value={measurement.left_arm_cm} onChange={(e) => setMeasurement(m => ({...m, left_arm_cm: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Right Arm (cm)</label>
                    <Input type="number" placeholder="e.g., 32" value={measurement.right_arm_cm} onChange={(e) => setMeasurement(m => ({...m, right_arm_cm: e.target.value}))} className="mt-1" />
                  </div>
                </div>
                <Input placeholder="Notes (optional)" value={measurement.notes} onChange={(e) => setMeasurement(m => ({...m, notes: e.target.value}))} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => addMeasurementMutation.mutate(measurement)} disabled={!measurement.weight_kg || addMeasurementMutation.isPending}>
                    {addMeasurementMutation.isPending ? "Saving..." : "Save Measurements"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddMeasurement(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {measLoading ? (
            <LoadingSpinner text="Loading measurements..." />
          ) : (measurements ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No measurements logged yet.</p>
              <Button className="mt-3" onClick={() => setShowAddMeasurement(true)}>Log your first measurement</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(measurements ?? []).map((m, idx) => {
                const previous = measurements?.[idx + 1];
                const weight_delta = previous ? (m.weight_kg || 0) - (previous.weight_kg || 0) : null;
                const waist_delta = previous ? (m.waist_cm || 0) - (previous.waist_cm || 0) : null;
                
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{format(parseISO(m.measured_at), "MMM d, yyyy")}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(m.measured_at), "EEEE 'at' h:mm a")}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {m.weight_kg && (
                          <div>
                            <p className="text-muted-foreground text-xs">Weight</p>
                            <p className="font-semibold flex items-center gap-1">
                              {m.weight_kg}kg
                              {weight_delta !== null && (
                                <span className={`text-xs ${weight_delta < 0 ? "text-success" : "text-destructive"}`}>
                                  {weight_delta > 0 ? "+" : ""}{weight_delta.toFixed(1)}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {m.waist_cm && (
                          <div>
                            <p className="text-muted-foreground text-xs">Waist</p>
                            <p className="font-semibold flex items-center gap-1">
                              {m.waist_cm}cm
                              {waist_delta !== null && (
                                <span className={`text-xs ${waist_delta < 0 ? "text-success" : "text-destructive"}`}>
                                  {waist_delta > 0 ? "+" : ""}{waist_delta.toFixed(1)}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {m.body_fat_percentage && <div><p className="text-muted-foreground text-xs">Body Fat</p><p className="font-semibold">{m.body_fat_percentage}%</p></div>}
                        {m.chest_cm && <div><p className="text-muted-foreground text-xs">Chest</p><p className="font-semibold">{m.chest_cm}cm</p></div>}
                        {m.left_arm_cm && <div><p className="text-muted-foreground text-xs">Left Arm</p><p className="font-semibold">{m.left_arm_cm}cm</p></div>}
                        {m.right_arm_cm && <div><p className="text-muted-foreground text-xs">Right Arm</p><p className="font-semibold">{m.right_arm_cm}cm</p></div>}
                      </div>
                      {m.notes && <p className="text-xs text-muted-foreground mt-2">📝 {m.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{progressPhotos?.length ?? 0} photos</p>
            <Button size="sm" onClick={() => setShowUploadPhoto(true)}>
              <Camera className="h-4 w-4 mr-1" /> Upload Photo
            </Button>
          </div>

          {showUploadPhoto && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upload Progress Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-2">Photo Angle *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["front", "back", "side_left", "side_right"] as const).map(angle => (
                      <button
                        key={angle}
                        onClick={() => setSelectedPhotoAngle(angle)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          selectedPhotoAngle === angle
                            ? "bg-primary text-white"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {angle.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {!photoPreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-all"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Click to upload a photo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <img src={photoPreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => uploadPhotoMutation.mutate(photoFile!)} disabled={!photoFile || uploadPhotoMutation.isPending}>
                        {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
                      </Button>
                      <Button variant="outline" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}>Choose Different</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(progressPhotos ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No photos yet.</p>
              <Button className="mt-3" onClick={() => setShowUploadPhoto(true)}>Upload your first photo</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(progressPhotos ?? []).map((photo) => (
                <Card key={photo.id}>
                  <CardContent className="p-0 overflow-hidden">
                    <div className="relative">
                      <img src={photo.photo_url} alt="Progress" className="w-full h-64 object-cover" />
                      <div className="absolute top-0 right-0 m-2 space-x-2 flex">
                        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded capitalize">{photo.view_angle.replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">{format(parseISO(photo.taken_at), "MMM d, yyyy 'at' h:mm a")}</p>
                          {photo.notes && <p className="text-xs text-foreground mt-1">📝 {photo.notes}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePhotoMutation.mutate(photo.id)}
                          disabled={deletePhotoMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{goals?.length ?? 0} goals</p>
            <Button size="sm" onClick={() => setShowAddGoal(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Goal
            </Button>
          </div>

          {showAddGoal && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Set a Fitness Goal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Goal title *" value={goal.title} onChange={(e) => setGoal(g => ({...g, title: e.target.value}))} />
                <select value={goal.goal_type} onChange={(e) => setGoal(g => ({...g, goal_type: e.target.value}))}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                  <option value="weight">Weight Loss</option>
                  <option value="muscle">Muscle Gain</option>
                  <option value="waist">Waist Reduction</option>
                  <option value="bench">Bench Press</option>
                  <option value="squat">Squat</option>
                  <option value="other">Other</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Target Value *</label>
                    <Input type="number" step="0.1" placeholder="e.g., 70" value={goal.target_value} onChange={(e) => setGoal(g => ({...g, target_value: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Current Value</label>
                    <Input type="number" step="0.1" placeholder="e.g., 80" value={goal.current_value} onChange={(e) => setGoal(g => ({...g, current_value: e.target.value}))} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={goal.unit} onChange={(e) => setGoal(g => ({...g, unit: e.target.value}))}
                    className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="kg">Kilograms (kg)</option>
                    <option value="cm">Centimeters (cm)</option>
                    <option value="lbs">Pounds (lbs)</option>
                    <option value="reps">Repetitions</option>
                  </select>
                  <div>
                    <label className="text-xs text-muted-foreground">Target Date</label>
                    <Input type="date" value={goal.target_date} onChange={(e) => setGoal(g => ({...g, target_date: e.target.value}))} className="mt-1" />
                  </div>
                </div>
                <Input placeholder="Notes (optional)" value={goal.notes} onChange={(e) => setGoal(g => ({...g, notes: e.target.value}))} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => addGoalMutation.mutate(goal)} disabled={!goal.title || !goal.target_value || addGoalMutation.isPending}>
                    {addGoalMutation.isPending ? "Creating..." : "Create Goal"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(goals ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No goals yet.</p>
              <Button className="mt-3" onClick={() => setShowAddGoal(true)}>Set your first goal</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(goals ?? []).map((g) => {
                const progress = g.current_value && g.target_value 
                  ? Math.min((g.current_value / Math.abs(g.target_value - (g.current_value || 0))) * 100, 100)
                  : 0;
                const isCompleted = g.status === "completed";
                
                return (
                  <Card key={g.id} className={isCompleted ? "opacity-75" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{g.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.goal_type} • {g.unit}</p>
                        </div>
                        {isCompleted && <span className="text-sm font-semibold text-success">✓ Completed</span>}
                      </div>
                      <div className="flex justify-between items-end text-xs text-muted-foreground mb-2">
                        <span>{g.current_value ?? 0}{g.unit} → {g.target_value}{g.unit}</span>
                        <span>{g.target_date ? format(parseISO(g.target_date), "MMM d, yyyy") : "No deadline"}</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      {g.notes && <p className="text-xs text-muted-foreground mt-2">📝 {g.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-muted-foreground">{earnedAchievements.length} of {allAchievements?.length ?? 0} earned</p>

          {(allAchievements ?? []).length === 0 ? (
            <LoadingSpinner text="Loading achievements..." />
          ) : (
            <div className="space-y-2">
              {(allAchievements ?? []).map((ach) => {
                const earned = unlockedAchievements.has(ach.id);
                const earnedData = earnedAchievements.find(e => e.achievement_id === ach.id);
                
                return (
                  <Card key={ach.id} className={!earned ? "opacity-50" : ""}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                        earned ? "bg-primary/20 border-2 border-primary" : "bg-muted border-2 border-border"
                      }`}>
                        {ach.badge_icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{ach.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{ach.description}</p>
                        {earnedData && (
                          <p className="text-xs text-success mt-1">
                            ✓ Earned on {format(parseISO(earnedData.earned_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
