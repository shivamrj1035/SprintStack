import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFormTemplates,
  saveFormTemplate,
  deleteFormTemplate,
  getProjects,
} from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Layers,
  ArrowRight,
  Loader2,
  FolderOpen,
  Info,
  Calendar,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/forms/")({
  component: FormsDashboardPage,
});

function FormsDashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();

  // Active workspace context
  const { activeOrgId, activeOrg } = useWorkspace();
  const primaryOrganization = activeOrg;

  const isAdmin = primaryOrganization?.can_manage || isSuperAdmin;

  // Load Form Templates
  const templatesQ = useQuery({
    queryKey: ["form-templates", primaryOrganization?.id],
    queryFn: () => getFormTemplates({ data: { organization_id: primaryOrganization?.id ?? "" } }),
    enabled: !!primaryOrganization?.id,
  });

  const templates = useMemo(() => templatesQ.data ?? [], [templatesQ.data]);

  // Load Projects
  const projectsQ = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => getProjects(),
  });
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data]);

  const filteredProjects = useMemo(() => {
    if (!primaryOrganization?.id) return [];
    return projects.filter((p) => p.organization_id === primaryOrganization.id);
  }, [projects, primaryOrganization]);

  // Dialog and input states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">(
    "all",
  );

  // Mutation to create a new template
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      organization_id: string;
      project_id: string | null;
    }) =>
      saveFormTemplate({
        data: {
          organization_id: data.organization_id,
          project_id: data.project_id,
          name: data.name,
          description: data.description,
          status: "draft",
          fields: [],
          version: "v1",
        },
      }),
    onSuccess: (createdTemplate) => {
      qc.invalidateQueries({ queryKey: ["form-templates", primaryOrganization?.id] });
      setCreateDialogOpen(false);
      setName("");
      setDescription("");
      setProjectId("none");
      toast.success("Form template created!");

      const createdId = (createdTemplate as { id?: string })?.id;
      if (createdId) {
        navigate({
          to: "/forms/$id",
          params: { id: createdId },
        });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
    },
  });

  // Mutation to delete a template
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) =>
      deleteFormTemplate({
        data: {
          organization_id: primaryOrganization?.id ?? "",
          template_id: templateId,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-templates", primaryOrganization?.id] });
      toast.success("Template deleted successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    },
  });

  // Calculate Metrics from template data
  const metrics = useMemo(() => {
    const total = templates.length;
    const draft = templates.filter((t) => t.status === "draft").length;
    const published = templates.filter((t) => t.status === "published").length;
    const archived = templates.filter((t) => t.status === "archived").length;
    return { total, draft, published, archived };
  }, [templates]);

  // Filtered Templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [templates, searchQuery, statusFilter]);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!primaryOrganization?.id) {
      toast.error("No active organization found");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      organization_id: primaryOrganization.id,
      project_id: projectId === "none" ? null : projectId,
    });
  };

  const handleProjectSelect = (val: string) => {
    if (val === "new_project") {
      setCreateDialogOpen(false);
      navigate({ to: "/projects", search: { new: "true" } });
      return;
    }
    setProjectId(val);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Form Templates
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design and manage reusable form templates for data collection
          </p>
        </div>

        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">Create Template</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new form template. You can add fields after creation.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter template name"
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mapped Project</Label>
                  <Select value={projectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        None
                      </SelectItem>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="new_project"
                        className="text-xs text-primary font-medium hover:bg-primary/5 cursor-pointer"
                      >
                        + Create New Project
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this template is for..."
                    rows={3}
                    className="text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="text-xs bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { label: "TOTAL", count: metrics.total, color: "text-primary" },
          { label: "DRAFT", count: metrics.draft, color: "text-muted-foreground" },
          { label: "PUBLISHED", count: metrics.published, color: "text-emerald-500" },
          { label: "ARCHIVED", count: metrics.archived, color: "text-red-500" },
        ].map((item) => (
          <Card key={item.label} className="bg-surface/50 border-border">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight">{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-border/40 pb-4">
        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-8 pl-8 text-xs bg-surface-2/40 border-border/70 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Status badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["all", "draft", "published", "archived"] as const).map((stat) => {
            const isActive = statusFilter === stat;
            const countMap = {
              all: metrics.total,
              draft: metrics.draft,
              published: metrics.published,
              archived: metrics.archived,
            };
            return (
              <button
                key={stat}
                onClick={() => setStatusFilter(stat)}
                className={`text-[10px] px-2.5 py-1 rounded-md transition flex items-center gap-1.5 capitalize font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-surface-2 text-muted-foreground hover:bg-surface-2/80 hover:text-foreground"
                }`}
              >
                {stat}
                <span
                  className={`px-1 rounded text-[8px] ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface text-muted-foreground"
                  }`}
                >
                  {countMap[stat]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates List Table */}
      {templatesQ.isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2/10 p-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <div className="mt-3 text-sm font-semibold">No form templates found</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search query or filters to find results."
              : "Organization Admins can create reusable form templates to collect work item metrics."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <Table>
            <TableHeader className="bg-surface-2/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10">
                  Template
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-24">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-32">
                  Mapped Project
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-24 text-right">
                  Fields
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-24">
                  Version
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-36">
                  Created By
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-36">
                  Last Updated
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase h-10 w-20 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((temp) => (
                <TableRow key={temp.id} className="border-border hover:bg-surface-2/10">
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{temp.name}</span>
                      {temp.description && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                          {temp.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      className={`text-[9px] font-semibold uppercase px-2 py-0.5 border-none ${
                        temp.status === "published"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : temp.status === "archived"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {temp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-xs font-medium text-muted-foreground">
                    {temp.project_name || (
                      <span className="text-muted-foreground/40 italic">None</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right text-xs font-mono font-medium text-foreground">
                    <span className="flex items-center justify-end gap-1.5">
                      <Layers className="h-3 w-3 text-muted-foreground/60" />
                      {temp.fields.length}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-xs font-mono text-muted-foreground">
                    {temp.version}
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {temp.created_by.split(":")[0]}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span>{new Date(temp.updated_at).toLocaleDateString()}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          navigate({
                            to: "/forms/$id",
                            params: { id: temp.id },
                          })
                        }
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this form template?")) {
                              deleteMutation.mutate(temp.id);
                            }
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
