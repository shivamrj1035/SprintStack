import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  addOrganizationMember,
  createOrganization,
  getOrganizationMembers,
  getWorkspaceContext,
  updateOrganizationMemberRole,
  updateOrganizationSettings,
  getProjects,
  getCustomTimesheetForms,
  saveCustomTimesheetForm,
  deleteCustomTimesheetForm,
} from "@/server-fns/functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  Plus,
  Shield,
  Users,
  FileText,
  Trash2,
  Edit2,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/organizations")({
  component: OrganizationsPage,
});

const MODULES = ["projects", "tasks", "timesheets", "dashboard", "personal_workspace"];
const MEMBER_ROLES = ["admin", "manager", "member"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function OrganizationsPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);
  const [modules, setModules] = useState<string[]>([
    "projects",
    "tasks",
    "timesheets",
    "dashboard",
  ]);

  const workspaceQ = useQuery({
    queryKey: ["workspace-context"],
    queryFn: () => getWorkspaceContext(),
  });

  async function submit() {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setCreating(true);
    try {
      await createOrganization({
        data: {
          name: name.trim(),
          slug: slug || slugify(name),
          adminEmail: adminEmail || null,
          logo_url: logoUrl || null,
          theme_color: themeColor,
          modules,
        },
      });
      toast.success("Organization created");
      setOpen(false);
      setName("");
      setSlug("");
      setAdminEmail("");
      setLogoUrl("");
      qc.invalidateQueries({ queryKey: ["workspace-context"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  const organizations = (workspaceQ.data?.organizations ?? []).filter(
    (org) => org.kind === "organization",
  );
  const manageableOrganizations = organizations.filter((org) => org.can_manage);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Organizations</h1>
          <p className="text-xs text-muted-foreground">
            Manage organization branding, members, and role-based access.
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" /> New organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">New organization</DialogTitle>
              </DialogHeader>
              <OrganizationFields
                name={name}
                setName={(value) => {
                  setName(value);
                  if (!slug) setSlug(slugify(value));
                }}
                slug={slug}
                setSlug={setSlug}
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
                themeColor={themeColor}
                setThemeColor={setThemeColor}
                modules={modules}
                setModules={setModules}
                adminEmail={adminEmail}
                setAdminEmail={setAdminEmail}
                showAdminEmail
              />
              <DialogFooter>
                <Button size="sm" onClick={submit} disabled={creating}>
                  {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {manageableOrganizations.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-sm text-muted-foreground">
          You do not manage any organization yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {manageableOrganizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrganizationFields({
  name,
  setName,
  slug,
  setSlug,
  logoUrl,
  setLogoUrl,
  themeColor,
  setThemeColor,
  modules,
  setModules,
  adminEmail,
  setAdminEmail,
  showAdminEmail,
}: {
  name: string;
  setName: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  themeColor: string;
  setThemeColor: (value: string) => void;
  modules: string[];
  setModules: (value: string[]) => void;
  adminEmail?: string;
  setAdminEmail?: (value: string) => void;
  showAdminEmail?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Company slug</Label>
        <Input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          className="mt-1 h-8"
        />
      </div>
      {showAdminEmail && setAdminEmail && (
        <div>
          <Label className="text-xs">First organization admin email</Label>
          <Input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="mt-1 h-8"
          />
        </div>
      )}
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div>
          <Label className="text-xs">Logo URL</Label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
            className="mt-1 h-8 p-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Enabled modules</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MODULES.map((module) => (
            <label key={module} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={modules.includes(module)}
                onCheckedChange={(checked) =>
                  setModules(
                    checked
                      ? Array.from(new Set([...modules, module]))
                      : modules.filter((item) => item !== module),
                  )
                }
              />
              {module.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: Awaited<ReturnType<typeof getWorkspaceContext>>["organizations"][number];
}) {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<(typeof MEMBER_ROLES)[number]>("member");
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url ?? "");
  const [themeColor, setThemeColor] = useState(organization.theme_color);
  const [modules, setModules] = useState<string[]>(organization.modules ?? []);

  useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug);
    setLogoUrl(organization.logo_url ?? "");
    setThemeColor(organization.theme_color);
    setModules(organization.modules ?? []);
  }, [organization]);

  const membersQ = useQuery({
    queryKey: ["organization-members", organization.id],
    queryFn: () => getOrganizationMembers({ data: { organization_id: organization.id } }),
  });

  async function addMember() {
    if (!memberEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setAddingMember(true);
    try {
      await addOrganizationMember({
        data: {
          organization_id: organization.id,
          email: memberEmail,
          role: memberRole,
        },
      });
      toast.success("Member access saved");
      setMemberEmail("");
      setMemberRole("member");
      setMemberDialogOpen(false);
      membersQ.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await updateOrganizationSettings({
        data: {
          organization_id: organization.id,
          name,
          slug,
          logo_url: logoUrl || null,
          theme_color: themeColor,
          modules,
        },
      });
      toast.success("Organization updated");
      setSettingsOpen(false);
      qc.invalidateQueries({ queryKey: ["workspace-context"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update organization");
    } finally {
      setSavingSettings(false);
    }
  }

  async function changeRole(membershipId: string, role: (typeof MEMBER_ROLES)[number]) {
    setChangingRoleId(membershipId);
    try {
      await updateOrganizationMemberRole({ data: { membership_id: membershipId, role } });
      toast.success("Role updated");
      membersQ.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setChangingRoleId(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
            style={{ background: organization.theme_color }}
          >
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt=""
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-medium">{organization.name}</h2>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {organization.current_user_role}
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">/{organization.slug}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(organization.modules ?? []).map((module) => (
                <span
                  key={module}
                  className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {(organization.current_user_role === "admin" ||
              organization.current_user_role === "super_admin" ||
              isSuperAdmin) && (
              <Dialog open={formsOpen} onOpenChange={setFormsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <FileText className="h-3 w-3" /> Custom Forms
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">
                      Customized Timesheet Forms - {organization.name}
                    </DialogTitle>
                  </DialogHeader>
                  <CustomTimesheetFormsBuilder organizationId={organization.id} />
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-sm">Organization settings</DialogTitle>
                </DialogHeader>
                <OrganizationFields
                  name={name}
                  setName={setName}
                  slug={slug}
                  setSlug={setSlug}
                  logoUrl={logoUrl}
                  setLogoUrl={setLogoUrl}
                  themeColor={themeColor}
                  setThemeColor={setThemeColor}
                  modules={modules}
                  setModules={setModules}
                />
                <DialogFooter>
                  <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings && <Loader2 className="h-3 w-3 animate-spin" />}
                    {savingSettings ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Users className="h-3.5 w-3.5 text-primary" />
            Members
          </div>
          <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Allow person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Allow person</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={memberRole}
                    onValueChange={(value) => setMemberRole(value as (typeof MEMBER_ROLES)[number])}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={addMember} disabled={addingMember}>
                  {addingMember && <Loader2 className="h-3 w-3 animate-spin" />}
                  {addingMember ? "Adding..." : "Add access"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Person</th>
                <th className="px-3 py-2 text-left font-medium">Organization</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(membersQ.data ?? []).map((member) => {
                const pending = member.user_id.startsWith("pending:");
                const changingRole = changingRoleId === member.id;
                return (
                  <tr key={member.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {member.profile_name ?? member.email ?? member.profile_email}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {member.profile_email ?? member.email ?? member.user_id}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{organization.name}</td>
                    <td className="px-3 py-2">
                      {member.role === "super_admin" ? (
                        <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Shield className="h-3 w-3" /> super admin
                        </span>
                      ) : (
                        <Select
                          value={member.role}
                          disabled={changingRole}
                          onValueChange={(value) =>
                            changeRole(member.id, value as (typeof MEMBER_ROLES)[number])
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            {changingRole ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Saving
                              </span>
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {pending ? "pending login" : "active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface CustomField {
  id: string;
  label: string;
  type: "text" | "date" | "select" | "number";
  required: boolean;
  options?: string[];
}

function CustomTimesheetFormsBuilder({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const formsQ = useQuery({
    queryKey: ["custom-timesheet-forms", organizationId],
    queryFn: () => getCustomTimesheetForms({ data: { organization_id: organizationId } }),
  });

  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const orgProjects = (projectsQ.data ?? []).filter((p) => p.organization_id === organizationId);

  const forms = formsQ.data ?? [];

  function startNew() {
    // Find first project that doesn't have a custom form yet
    const unusedProject = orgProjects.find(
      (p) => !forms.some((f: { project_id: string }) => f.project_id === p.id),
    );
    setSelectedProjectId(unusedProject?.id ?? "");
    setFields([]);
    setEditingFormId(null);
    setIsEditing(true);
  }

  function startEdit(form: {
    id: string;
    organization_id: string;
    project_id: string;
    fields: CustomField[];
    created_at: Date;
    updated_at: Date;
  }) {
    setSelectedProjectId(form.project_id);
    setFields(form.fields);
    setEditingFormId(form.id);
    setIsEditing(true);
  }

  async function handleDelete(formId: string) {
    if (!confirm("Are you sure you want to delete this custom timesheet form?")) return;
    try {
      await deleteCustomTimesheetForm({
        data: { organization_id: organizationId, form_id: formId },
      });
      toast.success("Custom form deleted");
      formsQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete form");
    }
  }

  function addField() {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      required: false,
      options: [],
    };
    setFields([...fields, newField]);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField<K extends keyof CustomField>(index: number, key: K, value: CustomField[K]) {
    const next = [...fields];
    next[index] = { ...next[index], [key]: value };
    setFields(next);
  }

  function addOption(fieldIndex: number) {
    const field = fields[fieldIndex];
    const options = field.options ? [...field.options, ""] : [""];
    updateField(fieldIndex, "options", options);
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const field = fields[fieldIndex];
    const options = field.options?.filter((_, i) => i !== optionIndex) ?? [];
    updateField(fieldIndex, "options", options);
  }

  function updateOption(fieldIndex: number, optionIndex: number, value: string) {
    const field = fields[fieldIndex];
    const options = field.options ? [...field.options] : [];
    options[optionIndex] = value;
    updateField(fieldIndex, "options", options);
  }

  async function handleSave() {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (fields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }
    for (const f of fields) {
      if (!f.label.trim()) {
        toast.error("All field labels are required");
        return;
      }
      if (f.type === "select" && (!f.options || f.options.some((o) => !o.trim()))) {
        toast.error("All dropdown options must have non-empty values");
        return;
      }
    }

    setSaving(true);
    try {
      await saveCustomTimesheetForm({
        data: {
          organization_id: organizationId,
          project_id: selectedProjectId,
          fields,
        },
      });
      toast.success(editingFormId ? "Form updated" : "Form created");
      setIsEditing(false);
      formsQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditing(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingFormId ? "Edit Form Template" : "New Form Template"}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Link to Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={!!editingFormId}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {orgProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs">Custom Fields</Label>
            {fields.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2 italic">
                No fields added yet. Add fields to capture specific time-tracking data.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, fIdx) => (
                  <div
                    key={field.id}
                    className="rounded-md border border-border p-3 space-y-2 bg-surface/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Field Label (e.g. Work Location, Mileage)"
                          value={field.label}
                          onChange={(e) => updateField(fIdx, "label", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-28">
                        <Select
                          value={field.type}
                          onValueChange={(val) =>
                            updateField(fIdx, "type", val as CustomField["type"])
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(fIdx, "required", !!checked)}
                        />
                        Required
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(fIdx)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {field.type === "select" && (
                      <div className="pl-4 border-l border-border space-y-1.5">
                        <div className="text-[10px] font-medium text-muted-foreground">
                          Dropdown Options
                        </div>
                        {(field.options || []).map((option, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <Input
                              placeholder={`Option ${oIdx + 1}`}
                              value={option}
                              onChange={(e) => updateOption(fIdx, oIdx, e.target.value)}
                              className="h-7 text-xs max-w-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(fIdx, oIdx)}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 mt-1"
                          onClick={() => addOption(fIdx)}
                        >
                          Add Option
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={addField} className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add custom field
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configured Templates
        </span>
        <Button size="sm" className="h-7 text-xs" onClick={startNew}>
          <Plus className="mr-1 h-3 w-3" /> New custom form
        </Button>
      </div>

      {formsQ.isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
        <div className="rounded-md border border-border/60 bg-surface/50 p-6 text-center text-xs text-muted-foreground">
          No custom timesheet forms defined yet for this organization. Add tailored fields to
          capture project-specific data.
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((form) => {
            const project = orgProjects.find((p) => p.id === form.project_id);
            return (
              <div
                key={form.id}
                className="flex items-center justify-between rounded-md border border-border p-3 bg-surface/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">
                    {project?.name ?? "Unknown Project"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {(form.fields as CustomField[]).map((f) => `${f.label} (${f.type})`).join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(form)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(form.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
