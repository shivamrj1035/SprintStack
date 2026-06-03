import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUSES,
  PRIORITIES,
  statusMeta,
  priorityMeta,
  type Status,
  type Priority,
} from "@/lib/task-meta";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getProjects,
  getPeople,
  createTask,
  updateTask,
  deleteTask,
} from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TaskDraft {
  id?: string;
  code?: string;
  title: string;
  description?: string | null;
  status: Status;
  priority: Priority;
  assignee_id?: string | null;
  project_id?: string | null;
  organization_id?: string | null;
  progress: number;
  estimated_hours: number;
  due_date?: string | null;
  sprint?: string | null;
  tags: string[];
}

export const EMPTY_TASK: TaskDraft = {
  title: "",
  status: "todo",
  priority: "medium",
  progress: 0,
  estimated_hours: 0,
  tags: [],
};

export function TaskDrawer({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: TaskDraft | null;
}) {
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeOrgId, organizations } = useWorkspace();

  useEffect(() => {
    if (task) {
      setDraft({
        ...EMPTY_TASK,
        organization_id: activeOrgId || null,
        ...task,
      });
    }
  }, [task, open, activeOrgId]);

  const projectsQ = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => await getProjects(),
  });
  const peopleQ = useQuery({
    queryKey: ["people"],
    queryFn: async () => await getPeople(),
  });

  async function save() {
    if (!draft.title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      description: draft.description ?? null,
      status: draft.status,
      priority: draft.priority,
      assignee_id: draft.assignee_id || null,
      project_id: draft.project_id || null,
      organization_id: draft.organization_id || null,
      progress: draft.progress,
      estimated_hours: draft.estimated_hours,
      due_date: draft.due_date || null,
      sprint: draft.sprint || null,
      tags: draft.tags,
    };
    try {
      if (draft.id) {
        await updateTask({ data: { id: draft.id, patch: payload } });
        toast.success("Task updated");
      } else {
        await createTask({ data: payload });
        toast.success("Task created");
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!draft.id) return;
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await deleteTask({ data: draft.id });
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-surface">
        <SheetHeader>
          <SheetTitle className="text-sm">
            {draft.id ? (
              <span className="font-mono text-xs text-muted-foreground">{draft.code}</span>
            ) : (
              "New task"
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={200}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              maxLength={2000}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Priority })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityMeta[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Workspace</Label>
              <Select
                value={draft.organization_id || ""}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    organization_id: v || null,
                    project_id: null,
                  })
                }
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.kind === "personal" ? "✨ Personal Workspace" : `📁 ${org.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select
                value={draft.project_id ?? "none"}
                onValueChange={(v) => setDraft({ ...draft, project_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projectsQ.data ?? [])
                    .filter((p) =>
                      draft.organization_id ? p.organization_id === draft.organization_id : true,
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assignee</Label>
              <Select
                value={draft.assignee_id ?? "none"}
                onValueChange={(v) => setDraft({ ...draft, assignee_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(peopleQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input
                type="date"
                value={draft.due_date ?? ""}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Estimate (h)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={draft.estimated_hours}
                onChange={(e) => setDraft({ ...draft, estimated_hours: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Sprint</Label>
              <Input
                value={draft.sprint ?? ""}
                onChange={(e) => setDraft({ ...draft, sprint: e.target.value })}
                maxLength={40}
                placeholder="Sprint 12"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Progress</Label>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {draft.progress}%
              </span>
            </div>
            <Slider
              value={[draft.progress]}
              max={100}
              step={5}
              onValueChange={(v) => setDraft({ ...draft, progress: v[0] })}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 10),
                })
              }
              className="mt-1 h-8 text-xs"
              placeholder="frontend, bug"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {draft.id ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={del}
                disabled={saving || deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3 w-3" />
                )}
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving || deleting}>
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {saving ? (draft.id ? "Saving..." : "Creating...") : draft.id ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
