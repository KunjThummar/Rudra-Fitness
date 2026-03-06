import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
}

export function PageHeader({ title, subtitle, actionLabel, actionIcon: ActionIcon, onAction, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3", className)}>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="gap-1.5">
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
