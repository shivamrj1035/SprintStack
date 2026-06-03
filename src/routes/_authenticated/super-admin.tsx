import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  getSuperAdminContext,
  updateOrganizationSubscription,
  toggleUserBlockStatus,
  updateUserCustomPermissions,
  updateUserWorkspaceRole,
  deleteOrganization,
} from "@/server-fns/functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Users,
  Shield,
  ShieldAlert,
  Search,
  Settings,
  Calendar,
  Lock,
  Unlock,
  Loader2,
  Check,
  ChevronRight,
  ShieldCheck,
  UserCog,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/super-admin")({
  component: SuperAdminPage,
});

type ActiveTab = "organizations" | "users";

function SuperAdminPage() {
  const { isSuperAdmin, user: actorUser } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("organizations");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Details states
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Form states for Organization editing
  const [validUntil, setValidUntil] = useState<string>("");
  const [maxUsers, setMaxUsers] = useState<number>(100);
  const [customFeatures, setCustomFeatures] = useState<Record<string, boolean>>({
    advanced_reports: false,
    custom_branding: false,
    api_access: false,
    form_layouts: true,
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // Form states for User Custom Permissions
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({
    can_create_projects: false,
    can_delete_tasks: false,
    can_view_ledger: false,
    can_manage_forms: false,
  });
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [updatingRoleMembershipId, setUpdatingRoleMembershipId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [confirmDeleteOrgId, setConfirmDeleteOrgId] = useState<string | null>(null);
  const [deletingOrg, setDeletingOrg] = useState(false);

  // Fetch data
  const adminQ = useQuery({
    queryKey: ["super-admin-context"],
    queryFn: () => getSuperAdminContext(),
    enabled: isSuperAdmin,
  });

  const { organizations = [], users = [], memberships = [] } = adminQ.data ?? {};

  // Find selected items
  const selectedOrg = useMemo(() => {
    return organizations.find((o) => o.id === selectedOrgId) ?? null;
  }, [organizations, selectedOrgId]);

  const selectedProfile = useMemo(() => {
    return users.find((u) => u.id === selectedProfileId) ?? null;
  }, [users, selectedProfileId]);

  // Load organization settings when selected
  const handleSelectOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setSelectedOrgId(orgId);
      setValidUntil(
        org.subscription_valid_until
          ? format(new Date(org.subscription_valid_until), "yyyy-MM-dd")
          : "",
      );
      setMaxUsers(org.max_users);
      const features = (org.custom_features as Record<string, boolean>) || {};
      setCustomFeatures({
        advanced_reports: !!features.advanced_reports,
        custom_branding: !!features.custom_branding,
        api_access: !!features.api_access,
        form_layouts: features.form_layouts !== false,
      });
    }
  };

  // Load user settings when selected
  const handleSelectUser = (profileId: string) => {
    const profile = users.find((u) => u.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      // Find first membership for default custom permissions
      const member = memberships.find((m) => m.user_id === profileId);
      const perms = (member?.custom_permissions as Record<string, boolean>) || {};
      setCustomPermissions({
        can_create_projects: !!perms.can_create_projects,
        can_delete_tasks: !!perms.can_delete_tasks,
        can_view_ledger: !!perms.can_view_ledger,
        can_manage_forms: !!perms.can_manage_forms,
      });
    }
  };

  // Actions
  const handleSaveOrgSubscription = async () => {
    if (!selectedOrgId) return;
    setSavingOrg(true);
    try {
      await updateOrganizationSubscription({
        data: {
          organizationId: selectedOrgId,
          subscriptionValidUntil: validUntil || null,
          maxUsers: maxUsers,
          customFeatures: customFeatures,
        },
      });
      toast.success("Subscription and customizations updated");
      qc.invalidateQueries({ queryKey: ["super-admin-context"] });
      qc.invalidateQueries({ queryKey: ["workspace-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    setDeletingOrg(true);
    try {
      await deleteOrganization({
        data: { organizationId: orgId },
      });
      toast.success("Organization successfully deleted");
      setSelectedOrgId(null);
      setConfirmDeleteOrgId(null);
      qc.invalidateQueries({ queryKey: ["super-admin-context"] });
      qc.invalidateQueries({ queryKey: ["workspace-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setDeletingOrg(false);
    }
  };

  const handleToggleBlock = async (profileId: string, currentBlocked: boolean) => {
    setBlockingUserId(profileId);
    try {
      await toggleUserBlockStatus({
        data: {
          userId: profileId,
          blocked: !currentBlocked,
        },
      });
      toast.success(!currentBlocked ? "User blocked successfully" : "User unblocked successfully");
      qc.invalidateQueries({ queryKey: ["super-admin-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change block status");
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleSaveUserPermissions = async (membershipId: string) => {
    setSavingPermissions(true);
    try {
      await updateUserCustomPermissions({
        data: {
          membershipId,
          customPermissions,
        },
      });
      toast.success("User permission overrides updated");
      qc.invalidateQueries({ queryKey: ["super-admin-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRoleChange = async (membershipId: string, role: "admin" | "member" | "manager") => {
    setUpdatingRoleMembershipId(membershipId);
    try {
      await updateUserWorkspaceRole({
        data: {
          membershipId,
          role,
        },
      });
      toast.success(`Role updated to ${role}`);
      qc.invalidateQueries({ queryKey: ["super-admin-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setUpdatingRoleMembershipId(null);
    }
  };

  // Filtered lists
  const filteredOrgs = useMemo(() => {
    return organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.slug.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [organizations, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [users, searchQuery]);

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive animate-pulse" />
        <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          You do not have permission to view the Super Admin controls. Please contact your system
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Super Admin Portal
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage global workspace environments, subscription validity, seats, user statuses, and
            permission overrides.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab("organizations");
            setSearchQuery("");
            setSelectedOrgId(null);
            setSelectedProfileId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "organizations"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" /> Organizations ({organizations.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("users");
            setSearchQuery("");
            setSelectedOrgId(null);
            setSelectedProfileId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> Users Management ({users.length})
        </button>
      </div>

      {/* Main Grid View */}
      {adminQ.isLoading ? (
        <Loading variant="inline" message="Loading administrative portal..." className="h-64" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left / Center Section: Search and List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={
                  activeTab === "organizations"
                    ? "Search environments by name or slug..."
                    : "Search users by name or email..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {activeTab === "organizations" ? (
              <div className="rounded-lg border border-border bg-surface/50 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-2 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="p-3">Environment</th>
                      <th className="p-3">Slug / Kind</th>
                      <th className="p-3">Seat Limit</th>
                      <th className="p-3">Subscription</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {filteredOrgs.map((org) => {
                      const isSelected = selectedOrgId === org.id;
                      const hasSubscription = org.subscription_valid_until;
                      const validDate = hasSubscription
                        ? new Date(org.subscription_valid_until!)
                        : null;
                      const isExpired = validDate ? validDate < new Date() : false;

                      return (
                        <tr
                          key={org.id}
                          onClick={() => handleSelectOrg(org.id)}
                          className={`cursor-pointer hover:bg-surface-2/60 transition-colors ${
                            isSelected ? "bg-primary/5 hover:bg-primary/5" : ""
                          }`}
                        >
                          <td className="p-3 font-semibold flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: org.theme_color }}
                            />
                            {org.name}
                          </td>
                          <td className="p-3">
                            <code className="text-[10px] text-muted-foreground bg-surface-2 px-1 py-0.5 rounded border border-border">
                              /{org.slug}
                            </code>
                            <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                              {org.kind}
                            </span>
                          </td>
                          <td className="p-3">{org.max_users} seats</td>
                          <td className="p-3">
                            {validDate ? (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                  isExpired
                                    ? "bg-destructive/15 text-destructive border border-destructive/20"
                                    : "bg-green-500/15 text-green-500 border border-green-500/20"
                                }`}
                              >
                                {isExpired
                                  ? "Expired"
                                  : "Valid until " + format(validDate, "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Unlimited</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <ChevronRight className="h-4 w-4 inline text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredOrgs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No organization environments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Org hierarchical groupings */}
                {organizations.map((org) => {
                  const orgMembers = memberships.filter((m) => m.organization_id === org.id);
                  if (orgMembers.length === 0) return null;

                  // Find membership details & map users
                  const mappedMembers = orgMembers
                    .map((m) => {
                      const profile = filteredUsers.find((u) => u.id === m.user_id);
                      if (!profile) return null;
                      return { membership: m, profile };
                    })
                    .filter(Boolean) as {
                    membership: (typeof memberships)[number];
                    profile: (typeof users)[number];
                  }[];

                  if (mappedMembers.length === 0) return null;

                  return (
                    <div
                      key={org.id}
                      className="rounded-lg border border-border bg-surface/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-xs font-bold flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: org.theme_color }}
                          />
                          📁 {org.name}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            ({org.kind} workspace)
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {mappedMembers.length} active users
                        </span>
                      </div>
                      <div className="divide-y divide-border/40">
                        {mappedMembers.map(({ membership, profile }) => {
                          const isSelected = selectedProfileId === profile.id;
                          return (
                            <div
                              key={membership.id}
                              onClick={() => {
                                handleSelectUser(profile.id);
                                setSelectedOrgId(org.id);
                              }}
                              className={`flex flex-wrap items-center justify-between gap-3 py-2 px-2 rounded-md cursor-pointer hover:bg-surface-2/60 transition-colors ${
                                isSelected
                                  ? "bg-primary/5 hover:bg-primary/5 border border-primary/25"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={profile.avatar_url || undefined}
                                    alt={profile.name || ""}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                    {(profile.name || profile.email || "U")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                                    {profile.name ?? "Clerk Member"}{" "}
                                    {profile.blocked && (
                                      <span className="bg-destructive/15 text-destructive text-[8px] font-bold rounded px-1.5 py-0.5 uppercase">
                                        Blocked
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {profile.email}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded bg-surface-2 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                                  {membership.role}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Section: Configuration Details (Dynamic Panel) */}
          <div className="lg:col-span-1">
            {activeTab === "organizations" ? (
              selectedOrg ? (
                <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <div
                      className="h-7 w-7 rounded-md flex items-center justify-center text-white"
                      style={{ background: selectedOrg.theme_color }}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold leading-tight">{selectedOrg.name}</h3>
                      <code className="text-[9px] text-muted-foreground">/{selectedOrg.slug}</code>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Expiration picker */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        Subscription Valid Until
                      </Label>
                      <Input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="mt-1 h-8 text-xs w-full cursor-pointer bg-surface-2"
                      />
                      <span className="text-[9px] text-muted-foreground block mt-1">
                        Leave blank for unlimited access.
                      </span>
                    </div>

                    {/* Max Seats Limit */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        Seat Allocation Limit
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                        className="mt-1 h-8 text-xs bg-surface-2"
                      />
                    </div>

                    {/* Customize Features */}
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Available Customizations
                      </Label>
                      {Object.keys(customFeatures).map((featureKey) => (
                        <label
                          key={featureKey}
                          className="flex items-center gap-2.5 text-xs font-medium cursor-pointer"
                        >
                          <Checkbox
                            checked={customFeatures[featureKey]}
                            onCheckedChange={(checked) =>
                              setCustomFeatures((prev) => ({
                                ...prev,
                                [featureKey]: !!checked,
                              }))
                            }
                          />
                          <span className="capitalize">{featureKey.replace("_", " ")}</span>
                        </label>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-8 text-xs mt-2"
                      onClick={handleSaveOrgSubscription}
                      disabled={savingOrg}
                    >
                      {savingOrg && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      Save Customizations
                    </Button>

                    {/* Danger Zone */}
                    <div className="border-t border-destructive/20 pt-4 mt-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                        Danger Zone
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Deleting this organization permanently deletes all projects, tasks,
                        timesheets, memberships, and related metadata. This action is irreversible.
                      </p>
                      {confirmDeleteOrgId === selectedOrg.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 h-8 text-[11px] font-bold animate-in fade-in zoom-in-95 duration-200"
                            onClick={() => handleDeleteOrg(selectedOrg.id)}
                            disabled={deletingOrg}
                          >
                            {deletingOrg ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Yes, Delete"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-[11px]"
                            onClick={() => setConfirmDeleteOrgId(null)}
                            disabled={deletingOrg}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                          onClick={() => setConfirmDeleteOrgId(selectedOrg.id)}
                        >
                          Delete Organization
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  Select an organization environment to customize subscription validity, seats, and
                  modules.
                </div>
              )
            ) : selectedProfile ? (
              // Find the active membership for this user inside the selected workspace
              (() => {
                const membership = memberships.find(
                  (m) => m.user_id === selectedProfile.id && m.organization_id === selectedOrgId,
                );

                return (
                  <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage
                          src={selectedProfile.avatar_url || undefined}
                          alt={selectedProfile.name || ""}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {(selectedProfile.name || selectedProfile.email || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold leading-tight truncate">
                          {selectedProfile.name ?? "Clerk Member"}
                        </h3>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {selectedProfile.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Block/Unblock Button */}
                      <div>
                        <Label className="text-[10px] text-muted-foreground block mb-1">
                          Account Status
                        </Label>
                        <Button
                          variant={selectedProfile.blocked ? "default" : "destructive"}
                          size="sm"
                          className="w-full h-8 text-xs font-bold flex items-center justify-center gap-1.5"
                          onClick={() =>
                            handleToggleBlock(selectedProfile.id, selectedProfile.blocked)
                          }
                          disabled={
                            blockingUserId === selectedProfile.id ||
                            selectedProfile.email?.toLowerCase() ===
                              actorUser?.primaryEmailAddress?.emailAddress?.toLowerCase()
                          }
                        >
                          {blockingUserId === selectedProfile.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : selectedProfile.blocked ? (
                            <>
                              <Unlock className="h-3.5 w-3.5" /> Unblock User Account
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Block User Account
                            </>
                          )}
                        </Button>
                        {selectedProfile.email?.toLowerCase() ===
                          actorUser?.primaryEmailAddress?.emailAddress?.toLowerCase() && (
                          <span className="text-[9px] text-muted-foreground/80 block mt-1">
                            You cannot block your own active session.
                          </span>
                        )}
                      </div>

                      {membership && (
                        <>
                          {/* Change Workspace Role */}
                          <div className="border-t border-border/40 pt-3">
                            <Label className="text-[10px] text-muted-foreground block mb-1.5">
                              Workspace Role (in{" "}
                              {organizations.find((o) => o.id === selectedOrgId)?.name})
                            </Label>
                            <Select
                              value={membership.role}
                              disabled={updatingRoleMembershipId === membership.id}
                              onValueChange={(val) =>
                                handleRoleChange(
                                  membership.id,
                                  val as "admin" | "member" | "manager",
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs bg-surface-2 border-border">
                                {updatingRoleMembershipId === membership.id ? (
                                  <span className="flex items-center gap-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                                  </span>
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-surface border-border">
                                <SelectItem value="admin" className="text-xs">
                                  Admin
                                </SelectItem>
                                <SelectItem value="member" className="text-xs">
                                  Member
                                </SelectItem>
                                <SelectItem value="manager" className="text-xs">
                                  Manager (Legacy)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Custom Permission Overrides */}
                          <div className="space-y-2 border-t border-border/40 pt-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <Label className="text-[10px] text-muted-foreground">
                                Permission Availability
                              </Label>
                              <HelpCircle
                                className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                                title="Overrides standard role defaults for this workspace"
                              />
                            </div>
                            {Object.keys(customPermissions).map((permKey) => (
                              <label
                                key={permKey}
                                className="flex items-center gap-2.5 text-xs font-medium cursor-pointer"
                              >
                                <Checkbox
                                  checked={customPermissions[permKey]}
                                  onCheckedChange={(checked) =>
                                    setCustomPermissions((prev) => ({
                                      ...prev,
                                      [permKey]: !!checked,
                                    }))
                                  }
                                />
                                <span className="capitalize">{permKey.replace(/_/g, " ")}</span>
                              </label>
                            ))}

                            <Button
                              size="sm"
                              className="w-full h-8 text-xs mt-2"
                              onClick={() => handleSaveUserPermissions(membership.id)}
                              disabled={savingPermissions}
                            >
                              {savingPermissions && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              )}
                              Save Overrides
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                <UserCog className="h-8 w-8 text-muted-foreground/60 mb-2" />
                Select a user membership to modify permissions options, change organization role, or
                block/unblock access.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
