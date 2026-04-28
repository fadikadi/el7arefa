import { Badge } from "@/components/ui/badge";

type StatusType = "open" | "full" | "cancelled" | "completed" | "pending" | "approved" | "rejected" | "withdrawn";

export function StatusBadge({ status, className = "" }: { status: StatusType; className?: string }) {
  const styles: Record<StatusType, string> = {
    open: "bg-primary text-primary-foreground hover:bg-primary/90",
    full: "bg-orange-500 text-white hover:bg-orange-600",
    cancelled: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    completed: "bg-muted text-muted-foreground hover:bg-muted/90",
    pending: "bg-orange-500 text-white hover:bg-orange-600",
    approved: "bg-primary text-primary-foreground hover:bg-primary/90",
    rejected: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    withdrawn: "bg-muted text-muted-foreground hover:bg-muted/90",
  };

  const labels: Record<StatusType, string> = {
    open: "Open",
    full: "Full",
    cancelled: "Cancelled",
    completed: "Completed",
    pending: "Pending",
    approved: "Approved",
    rejected: "Waitlist",
    withdrawn: "Withdrawn",
  };

  return (
    <Badge className={`px-2.5 py-0.5 font-semibold text-xs uppercase tracking-wider ${styles[status]} ${className}`}>
      {labels[status]}
    </Badge>
  );
}
