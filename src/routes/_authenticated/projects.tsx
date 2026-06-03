import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjects, getTasks, createProject } from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Plus, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
  validateSearch: (s) => ({ new: (s.new as string) ?? undefined }),
});

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A78BFA", "#06B6D4"];

function ProjectsPage() {
  const search = Route.useSearch();
  const { roles } = useAuth();
  const canCreate =
    roles.includes("super_admin") ||
    roles.includes("admin") ||
    roles.includes("manager") ||
    roles.length === 0;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const { activeOrgId, activeOrg, organizations } = useWorkspace();
  const [organizationId, setOrganizationId] = useState<string>(activeOrgId || "");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (activeOrgId) {
      setOrganizationId(activeOrgId);
    }
  }, [activeOrgId, open]);

  useEffect(() => {
    if (search.new) setOpen(true);
  }, [search.new]);

  const projectsQ = useQuery({
    queryKey: ["projects-page"],
    queryFn: () => getProjects(),
  });
  const tasksQ = useQuery({
    queryKey: ["projects-tasks"],
    queryFn: () => getTasks(),
  });

  async function create() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setCreating(true);
    try {
      await createProject({
        data: {
          name: name.trim(),
          description: desc.trim() || null,
          color,
          organization_id: organizationId,
        },
      });
      toast.success("Project created");
      setName("");
      setDesc("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["projects-page"] });
      qc.invalidateQueries({ queryKey: ["projects-list"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project";
      toast.error(
        message.includes("row-level") ? "Only managers/admins can create projects" : message,
      );
    } finally {
      setCreating(false);
    }
  }

  const filteredProjects = (projectsQ.data ?? []).filter((p) => p.organization_id === activeOrgId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
          <p className="text-xs text-muted-foreground">Group tasks, track delivery.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!canCreate}>
              <Plus className="mr-1 h-3 w-3" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">New project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Workspace</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
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
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <div className="mt-2 flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-surface ${color === c ? "ring-primary" : "ring-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
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

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <div className="mt-3 text-sm font-medium">No projects yet</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Managers and admins can create projects.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => {
            const pt = (tasksQ.data ?? []).filter((t) => t.project_id === p.id);
            const done = pt.filter((t) => t.status === "done").length;
            const pct = pt.length ? Math.round((done / pt.length) * 100) : 0;
            return (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {p.status}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {pt.length} tasks · {done} done
                    </span>
                    <span className="font-mono tabular-nums">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
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
