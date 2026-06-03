export const STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const statusMeta: Record<Status, { label: string; dot: string; chip: string }> = {
  backlog: { label: "Backlog", dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground" },
  todo: { label: "Todo", dot: "bg-chart-4", chip: "bg-chart-4/15 text-chart-4" },
  in_progress: { label: "In Progress", dot: "bg-primary", chip: "bg-primary/15 text-primary" },
  review: { label: "Review", dot: "bg-warning", chip: "bg-warning/15 text-warning" },
  done: { label: "Done", dot: "bg-success", chip: "bg-success/15 text-success" },
};

export const priorityMeta: Record<Priority, { label: string; chip: string }> = {
  low: { label: "Low", chip: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Medium", chip: "bg-chart-4/10 text-chart-4 border-chart-4/30" },
  high: { label: "High", chip: "bg-warning/10 text-warning border-warning/30" },
  urgent: { label: "Urgent", chip: "bg-destructive/15 text-destructive border-destructive/40" },
};
