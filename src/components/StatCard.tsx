import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, className }: StatCardProps) {
  const TrendIcon = changeType === "positive" ? TrendingUp : changeType === "negative" ? TrendingDown : Minus;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                <TrendIcon
                  className={cn(
                    "h-3 w-3",
                    changeType === "positive" && "text-success",
                    changeType === "negative" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    changeType === "positive" && "text-success",
                    changeType === "negative" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="rounded-xl bg-accent p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
