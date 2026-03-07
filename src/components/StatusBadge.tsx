import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "expired" | "paid" | "pending" | "overdue" | "suspended" | "cancelled" | "refunded";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  suspended: "bg-warning/15 text-warning border-warning/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium text-[11px]", statusStyles[status], className)}>
      {status}
    </Badge>
  );
}
