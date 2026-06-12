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
  removeOrganizationMember,
  updateMemberCustomPermissions,
  getAuditLogs,
  updateOrgMaxUsers,
  getProjects,
} from "@/server-fns/functions";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
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
  Key,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/organizations")({
  component: OrganizationsPage,
});

const MODULES = ["projects", "tasks", "timesheets", "dashboard", "personal_workspace"];
const MEMBER_ROLES = ["admin", "member"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function OrganizationsPage() {
  const { isSuperAdmin } = useAuth();
  const { activeOrg } = useWorkspace();
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Organization Settings</h1>
          <p className="text-xs text-muted-foreground">
            Manage your active organization's branding, members, and role-based access.
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

      {!activeOrg || activeOrg.kind === "personal" ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-sm text-muted-foreground text-center">
          Please select an organization workspace from the sidebar to manage its settings.
        </div>
      ) : !activeOrg.can_manage ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-sm text-muted-foreground text-center">
          You do not have permission to manage this organization's settings.
        </div>
      ) : (
        <OrganizationCard organization={activeOrg} />
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
  const { isSuperAdmin, profile } = useAuth();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [permissionsMemberId, setPermissionsMemberId] = useState<string | null>(null);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
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

  async function removeMember(membershipId: string) {
    setRemovingMemberId(membershipId);
    try {
      await removeOrganizationMember({ data: { membership_id: membershipId } });
      toast.success("Member removed");
      membersQ.refetch();
      qc.invalidateQueries({ queryKey: ["workspace-context"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  function openPermissions(membershipId: string, currentPerms: Record<string, boolean>) {
    setPermissionsMemberId(membershipId);
    setPermissionsMap(currentPerms ?? {});
  }

  async function savePermissions() {
    if (!permissionsMemberId) return;
    setSavingPermissions(true);
    try {
      await updateMemberCustomPermissions({
        data: { membership_id: permissionsMemberId, permissions: permissionsMap },
      });
      toast.success("Permissions saved");
      setPermissionsMemberId(null);
      membersQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  }

  const auditQ = useQuery({
    queryKey: ["audit-logs", organization.id],
    queryFn: () => getAuditLogs({ data: { organization_id: organization.id, limit: 50 } }),
    enabled: showAuditLog,
  });

  const PERMISSION_KEYS = [
    { key: "create:task", label: "Create tasks" },
    { key: "update:task", label: "Edit tasks" },
    { key: "delete:task", label: "Delete tasks" },
    { key: "create:project", label: "Create projects" },
    { key: "update:project", label: "Edit projects" },
    { key: "delete:project", label: "Delete projects" },
    { key: "manage:timesheets", label: "Manage team timesheets" },
    { key: "manage:members", label: "Manage members" },
  ];

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
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(membersQ.data ?? []).map((member) => {
                const pending = member.user_id.startsWith("pending:");
                const changingRole = changingRoleId === member.id;
                const isRemoving = removingMemberId === member.id;
                const isSelf =
                  profile?.email &&
                  (member.email === profile.email || member.profile_email === profile.email);
                const inviteAgeMs =
                  pending && member.created_at
                    ? Date.now() - new Date(member.created_at).getTime()
                    : 0;
                const isExpiredInvite = pending && inviteAgeMs > 30 * 24 * 60 * 60 * 1000;
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
                          disabled={changingRole || Boolean(isSelf)}
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
                      {isExpiredInvite ? (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                          invite expired
                        </span>
                      ) : (
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {pending ? "pending login" : "active"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!isSelf && (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              openPermissions(
                                member.id,
                                (member.custom_permissions as Record<string, boolean>) ?? {},
                              )
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Custom permissions"
                          >
                            <Key className="h-3 w-3" />
                          </button>
                          <button
                            disabled={isRemoving}
                            onClick={() => removeMember(member.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title="Remove member"
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Settings</h3>
          <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
            {savingSettings && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {savingSettings ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        <div className="max-w-2xl">
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
        </div>
      </div>

      {/* Audit log */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={() => setShowAuditLog((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
        >
          <ScrollText className="h-4 w-4" />
          Audit Log
          <span className="ml-1 text-[10px] text-muted-foreground">{showAuditLog ? "▲" : "▼"}</span>
        </button>
        {showAuditLog && (
          <div className="mt-3 overflow-hidden rounded-md border border-border">
            {auditQ.isLoading ? (
              <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : (auditQ.data ?? []).length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No activity recorded yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-surface-2 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-left font-medium">Actor</th>
                    <th className="px-3 py-2 text-left font-medium">Entity</th>
                    <th className="px-3 py-2 text-left font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditQ.data ?? []).map((log) => (
                    <tr key={log.id} className="border-t border-border/60">
                      <td className="px-3 py-1.5 font-mono text-[11px]">{log.action}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {log.actor_email ?? log.actor_id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {log.entity_type ?? "—"}
                        {log.entity_id ? (
                          <span className="ml-1 font-mono text-[10px] opacity-60">
                            {log.entity_id.slice(0, 8)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Custom permissions dialog */}
      <Dialog
        open={!!permissionsMemberId}
        onOpenChange={(v) => {
          if (!v) setPermissionsMemberId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Custom permissions</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Override role defaults for this member. Unset = follow role. On = always allow. Off =
            always deny.
          </p>
          <div className="space-y-2 py-1">
            {PERMISSION_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs">{label}</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setPermissionsMap((m) => {
                        const next = { ...m };
                        delete next[key];
                        return next;
                      })
                    }
                    className={`rounded px-1.5 py-0.5 ${!(key in permissionsMap) ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionsMap((m) => ({ ...m, [key]: true }))}
                    className={`rounded px-1.5 py-0.5 ${permissionsMap[key] === true ? "bg-success/15 font-semibold text-success" : "text-muted-foreground"}`}
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionsMap((m) => ({ ...m, [key]: false }))}
                    className={`rounded px-1.5 py-0.5 ${permissionsMap[key] === false ? "bg-destructive/10 font-semibold text-destructive" : "text-muted-foreground"}`}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPermissionsMemberId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={savePermissions} disabled={savingPermissions}>
              {savingPermissions && <Loader2 className="h-3 w-3 animate-spin" />}
              {savingPermissions ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
