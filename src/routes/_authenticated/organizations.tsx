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
              </tr>
            </thead>
            <tbody>
              {(membersQ.data ?? []).map((member) => {
                const pending = member.user_id.startsWith("pending:");
                const changingRole = changingRoleId === member.id;
                const isSelf =
                  profile?.email &&
                  (member.email === profile.email || member.profile_email === profile.email);
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
    </div>
  );
}
