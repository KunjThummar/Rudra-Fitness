import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Star, Flame, Target, Zap } from "lucide-react";
import { format } from "date-fns";

export default function MemberAchievementsPage() {
  const { user } = useAuth();

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["member-achievements-full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_achievements")
        .select("*, achievements(*)")
        .eq("member_id", user!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: allAchievements } = useQuery({
    queryKey: ["all-achievements-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true)
        .order("category");
      return data ?? [];
    },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Polishing your trophies..." />;

  const earnedIds = new Set((achievements ?? []).map((a: any) => a.achievement_id));
  const totalEarned = earnedIds.size;
  const totalAvailable = allAchievements?.length ?? 0;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Achievements"
        subtitle={`You've earned ${totalEarned} of ${totalAvailable} available badges`}
      />

      {/* Progress Overview */}
      <div className="px-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Hall of Fame</p>
                <p className="text-xs text-muted-foreground">{totalEarned} Badges unlocked</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{Math.round((totalEarned / (totalAvailable || 1)) * 100)}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Complete</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {["workout", "attendance", "milestone", "social"].map(category => {
        const categoryItems = (allAchievements ?? []).filter(a => a.category === category);
        if (categoryItems.length === 0) return null;

        return (
          <div key={category} className="px-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">{category} Badges</h2>
            <div className="grid grid-cols-2 gap-3">
              {categoryItems.map(achievement => {
                const earned = earnedIds.has(achievement.id);
                const earnedData = (achievements ?? []).find((a: any) => a.achievement_id === achievement.id);

                return (
                  <Card key={achievement.id} className={earned ? "border-primary/30 relative overflow-hidden" : "opacity-40"}>
                    {earned && (
                      <div className="absolute top-0 right-0 p-1">
                        <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                          <Star className="h-2 w-2 text-white fill-white" />
                        </div>
                      </div>
                    )}
                    <CardContent className="p-4 text-center space-y-2">
                       <span className={`text-4xl block ${earned ? "filter-none" : "grayscale"}`}>
                        {achievement.badge_icon || "🏆"}
                       </span>
                       <div>
                         <p className="text-sm font-bold text-foreground">{achievement.name}</p>
                         <p className="text-[10px] text-muted-foreground line-clamp-2">{achievement.description}</p>
                       </div>
                       {earned && earnedData && (
                         <p className="text-[9px] text-primary/80 pt-1">
                           Earned on {format(new Date(earnedData.earned_at), "MMM d, yyyy")}
                         </p>
                       )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
