import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTasks, getProjects, getPeople, updateTask } from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  statusMeta,
  priorityMeta,
  STATUSES,
  PRIORITIES,
  type Status,
  type Priority,
} from "@/lib/task-meta";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";
import { TaskDrawer, EMPTY_TASK, type TaskDraft } from "@/components/app/TaskDrawer";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
  validateSearch: (s) => ({ new: (s.new as string) ?? undefined }),
});

function TasksPage() {
  const search = Route.useSearch();
  const { activeOrgId } = useWorkspace();
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskDraft | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount = [filterStatus !== "all", filterPriority !== "all", filterProject !== "all"].filter(
    Boolean,
  ).length;

  useEffect(() => {
    if (search.new) {
      setActiveTask({ ...EMPTY_TASK });
      setDrawerOpen(true);
    }
  }, [search.new]);

  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: () => getTasks() });
  const projectsQ = useQuery({ queryKey: ["projects-list"], queryFn: () => getProjects() });
  const peopleQ = useQuery({ queryKey: ["people"], queryFn: () => getPeople() });

  const projectsById = useMemo(
    () => Object.fromEntries((projectsQ.data ?? []).map((p) => [p.id, p])),
    [projectsQ.data],
  );
  const peopleById = useMemo(
    () => Object.fromEntries((peopleQ.data ?? []).map((p) => [p.id, p])),
    [peopleQ.data],
  );

  const tasks = (tasksQ.data ?? []).filter((t) => {
    if (t.organization_id !== activeOrgId) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (
      q &&
      !(
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.code.toLowerCase().includes(q.toLowerCase())
      )
    )
      return false;
    return true;
  });

  const orgProjects = (projectsQ.data ?? []).filter((p) => p.organization_id === activeOrgId);

  async function inlineUpdate(id: string, patch: Record<string, unknown>) {
    setUpdatingTaskIds((current) => new Set(current).add(id));
    try {
      await updateTask({ data: { id, patch } });
      tasksQ.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setUpdatingTaskIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function openNew() {
    setActiveTask({ ...EMPTY_TASK });
    setDrawerOpen(true);
  }

  function openTask(t: (typeof tasks)[number]) {
    setActiveTask({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description,
      status: t.status as Status,
      priority: t.priority as Priority,
      assignee_id: t.assignee_id,
      project_id: t.project_id,
      organization_id: t.organization_id,
      progress: t.progress,
      estimated_hours: Number(t.estimated_hours),
      due_date: t.due_date ? format(new Date(t.due_date), "yyyy-MM-dd") : null,
      sprint: t.sprint,
      tags: t.tags ?? [],
    });
    setDrawerOpen(true);
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-muted-foreground">
      <div className="text-sm">No tasks match.</div>
      <div className="mt-1 text-[11px]">Create your first task to get started.</div>
      <Button size="sm" onClick={openNew} className="mt-3 h-7 text-xs">
        <Plus className="mr-1 h-3 w-3" /> New task
      </Button>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-3rem)] flex-col">
      {/* ── Mobile Toolbar ── */}
      <div className="md:hidden flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="h-8 w-full pl-7 text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterSheetOpen(true)}
          className="h-8 shrink-0 gap-1"
        >
          <Filter className="h-3.5 w-3.5" />
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button size="sm" onClick={openNew} className="h-8 shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Desktop Toolbar ── */}
      <div className="hidden md:flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="h-7 w-56 pl-7 text-xs"
          />
        </div>
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusMeta[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {priorityMeta[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {orgProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {tasks.length} tasks
          </span>
          <Button size="sm" onClick={openNew} className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" /> New task
          </Button>
        </div>
      </div>

      {/* ── Mobile Card List ── */}
      <div className="md:hidden flex-1 overflow-y-auto scroll-touch">
        {tasks.length === 0 ? (
          emptyState
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border/40 bg-surface/50 px-3 py-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{tasks.length} tasks</span>
            </div>
            {tasks.map((t) => {
              const sm = statusMeta[t.status as Status] ?? statusMeta.todo;
              const pm = priorityMeta[t.priority as Priority] ?? priorityMeta.medium;
              const proj = t.project_id ? projectsById[t.project_id] : null;
              const person = t.assignee_id ? peopleById[t.assignee_id] : null;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 border-b border-border/60 px-3 py-3 cursor-pointer active:bg-surface-2 transition-colors touch-target"
                  onClick={() => openTask(t)}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                        {sm.label}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${pm.chip}`}>
                        {pm.label}
                      </span>
                    </div>
                    <div className="text-[13px] font-medium text-foreground leading-snug">{t.title}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {proj && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: proj.color }}
                          />
                          {proj.name}
                        </span>
                      )}
                      {person && (
                        <span className="text-[10px] text-muted-foreground">
                          {person.name ?? person.email}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Due {format(new Date(t.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                    {Number(t.progress) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{t.progress}%</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden md:block min-w-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-surface text-muted-foreground">
            <tr className="border-b border-border">
              <Th>ID</Th>
              <Th className="min-w-[280px]">Title</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Assignee</Th>
              <Th>Project</Th>
              <Th>Due</Th>
              <Th>Hours</Th>
              <Th>Progress</Th>
              <Th>Sprint</Th>
              <Th>Tags</Th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="mx-auto max-w-xs">
                    <div className="text-sm">No tasks match.</div>
                    <div className="mt-1 text-[11px]">Create your first task to get started.</div>
                    <Button size="sm" onClick={openNew} className="mt-3 h-7 text-xs">
                      <Plus className="mr-1 h-3 w-3" /> New task
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const sm = statusMeta[t.status as Status] ?? statusMeta.todo;
                const pm = priorityMeta[t.priority as Priority] ?? priorityMeta.medium;
                const proj = t.project_id ? projectsById[t.project_id] : null;
                const person = t.assignee_id ? peopleById[t.assignee_id] : null;
                const updating = updatingTaskIds.has(t.id);
                return (
                  <tr
                    key={t.id}
                    className="group cursor-pointer border-b border-border/60 hover:bg-surface-2"
                    onClick={() => openTask(t)}
                  >
                    <Td className="font-mono text-[10px] text-muted-foreground">{t.code}</Td>
                    <Td className="font-medium">{t.title}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={t.status}
                        disabled={updating}
                        onValueChange={(v) => inlineUpdate(t.id, { status: v })}
                      >
                        <SelectTrigger
                          className={`h-6 border-0 bg-transparent px-1.5 text-[10px] ${sm.chip} rounded`}
                        >
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
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={t.priority}
                        disabled={updating}
                        onValueChange={(v) => inlineUpdate(t.id, { priority: v })}
                      >
                        <SelectTrigger
                          className={`h-6 border bg-transparent px-1.5 text-[10px] ${pm.chip} rounded`}
                        >
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
                    </Td>
                    <Td className="text-muted-foreground">
                      {person?.name ?? person?.email ?? "—"}
                    </Td>
                    <Td>
                      {proj ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: proj.color }}
                          />
                          {proj.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-muted-foreground">
                      {t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}
                    </Td>
                    <Td className="font-mono tabular-nums">
                      {Number(t.logged_hours)}/{Number(t.estimated_hours)}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {t.progress}%
                        </span>
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">{t.sprint ?? "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(t.tags ?? []).slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Filter Sheet ── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-border/60 bg-sidebar px-4 pb-8 pt-5"
        >
          <SheetTitle className="mb-4 text-sm font-semibold">Filter Tasks</SheetTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priority</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityMeta[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {orgProjects.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Project
                </label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {orgProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterPriority("all");
                  setFilterProject("all");
                }}
                className="h-9 w-full text-xs"
              >
                Clear all filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TaskDrawer open={drawerOpen} onOpenChange={setDrawerOpen} task={activeTask} />
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <td onClick={onClick} className={`px-3 py-1.5 ${className}`}>
      {children}
    </td>
  );
}
