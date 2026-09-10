import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "accent";
  className?: string;
}

export const QuickActionCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  variant = "default",
  className
}: QuickActionCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success/20 bg-success/5 hover:bg-success/10";
      case "warning":
        return "border-warning/20 bg-warning/5 hover:bg-warning/10";
      case "accent":
        return "border-accent/20 bg-accent/5 hover:bg-accent/10";
      default:
        return "border-border/50 bg-card hover:bg-muted/30";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "accent":
        return "text-accent";
      default:
        return "text-primary";
    }
  };

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-natural",
        getVariantStyles(),
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50", getIconColor())}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
    </Card>
  );
};