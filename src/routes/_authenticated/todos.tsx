import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  createPersonalTodo,
  deletePersonalTodo,
  getPersonalTodos,
  updatePersonalTodo,
} from "@/server-fns/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/todos")({
  component: TodosPage,
});

type TodoPriority = "low" | "normal" | "high";

function TodosPage() {
  const qc = useQueryClient();
  const { activeOrgId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("normal");
  const [pinned, setPinned] = useState(false);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [creating, setCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const todosQ = useQuery({
    queryKey: ["personal-todos", activeOrgId],
    queryFn: () => getPersonalTodos({ data: { organizationId: activeOrgId! } }),
    enabled: !!activeOrgId,
  });

  if (!activeOrgId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todos = (todosQ.data ?? []).filter((todo) =>
    filter === "all" ? true : todo.status === filter,
  );

  async function create() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      await createPersonalTodo({
        data: {
          organizationId: activeOrgId!,
          title: title.trim(),
          notes: notes.trim() || null,
          priority,
          pinned,
        },
      });
      toast.success("To-do added");
      setTitle("");
      setNotes("");
      setPriority("normal");
      setPinned(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["personal-todos", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to-do");
    } finally {
      setCreating(false);
    }
  }

  async function update(
    id: string,
    patch: Parameters<typeof updatePersonalTodo>[0]["data"]["patch"],
  ) {
    setUpdatingIds((current) => new Set(current).add(id));
    try {
      await updatePersonalTodo({ data: { id, patch } });
      qc.invalidateQueries({ queryKey: ["personal-todos", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update to-do");
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this to-do?")) return;
    setDeletingIds((current) => new Set(current).add(id));
    try {
      await deletePersonalTodo({ data: id });
      qc.invalidateQueries({ queryKey: ["personal-todos", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete to-do");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">To-dos</h1>
          <p className="text-xs text-muted-foreground">
            Keep personal reminders, important points, and quick notes in one private place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> New to-do
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">New to-do</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Important points</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(value) => setPriority(value as TodoPriority)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex h-8 items-center gap-2 text-xs">
                    <Checkbox
                      checked={pinned}
                      onCheckedChange={(checked) => setPinned(Boolean(checked))}
                    />
                    Pin
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={create} disabled={creating}>
                  {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
          <div className="text-sm font-medium">No to-dos here</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Add a note, reminder, or important point you do not want to forget.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {todos.map((todo) => {
            const done = todo.status === "done";
            const updating = updatingIds.has(todo.id);
            const deleting = deletingIds.has(todo.id);
            return (
              <div
                key={todo.id}
                className={`rounded-lg border border-border bg-surface p-4 ${done ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => update(todo.id, { status: done ? "open" : "done" })}
                    disabled={updating || deleting}
                    className="mt-0.5 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={`text-sm font-medium ${done ? "line-through" : ""}`}>
                        {todo.title}
                      </h2>
                      {todo.pinned && <Pin className="h-3 w-3 text-primary" />}
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {todo.priority}
                      </span>
                    </div>
                    {todo.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                        {todo.notes}
                      </p>
                    )}
                    <div className="mt-3 text-[10px] text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(todo.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={updating || deleting}
                      onClick={() => update(todo.id, { pinned: !todo.pinned })}
                    >
                      {updating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pin className={`h-3.5 w-3.5 ${todo.pinned ? "text-primary" : ""}`} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={updating || deleting}
                      onClick={() => remove(todo.id)}
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
