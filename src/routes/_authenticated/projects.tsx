import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getTasks,
  createProject,
  updateProject,
  deleteProject,
} from "@/server-fns/functions";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Plus, FolderKanban, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
  validateSearch: (s) => ({ new: (s.new as string) ?? undefined }),
});

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A78BFA", "#06B6D4"];

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  organization_id: string;
};

function ProjectsPage() {
  const search = Route.useSearch();
  const { roles, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || roles.includes("admin") || roles.includes("super_admin");
  const qc = useQueryClient();

  // Create dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const { activeOrgId, organizations } = useWorkspace();
  const [organizationId, setOrganizationId] = useState<string>(activeOrgId || "");
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editStatus, setEditStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeOrgId) setOrganizationId(activeOrgId);
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
      toast.error(message.includes("row-level") ? "Only admins can create projects" : message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(p: Project) {
    setEditProject(p);
    setEditName(p.name);
    setEditDesc(p.description ?? "");
    setEditColor(p.color);
    setEditStatus(p.status);
  }

  async function saveEdit() {
    if (!editProject || !editName.trim()) return;
    setSaving(true);
    try {
      await updateProject({
        data: {
          id: editProject.id,
          name: editName.trim(),
          description: editDesc.trim() || null,
          color: editColor,
          status: editStatus,
        },
      });
      toast.success("Project updated");
      setEditProject(null);
      qc.invalidateQueries({ queryKey: ["projects-page"] });
      qc.invalidateQueries({ queryKey: ["projects-list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject({ data: deleteTarget.id });
      toast.success("Project deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["projects-page"] });
      qc.invalidateQueries({ queryKey: ["projects-list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
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
          <div className="mt-1 text-xs text-muted-foreground">Admins can create projects.</div>
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {p.status}
                    </span>
                    {canCreate && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(p as Project)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Edit project"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p as Project)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
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

      {/* Edit project dialog */}
      <Dialog
        open={!!editProject}
        onOpenChange={(v) => {
          if (!v) setEditProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="mt-2 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-surface ${editColor === c ? "ring-primary" : "ring-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditProject(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its data.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
