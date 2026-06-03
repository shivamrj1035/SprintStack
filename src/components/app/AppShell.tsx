import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Timer,
  Building2,
  StickyNote,
  Command,
  Search,
  LogOut,
  Layers,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "./CommandPalette";
import { useState, useEffect, type ReactNode } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/timesheets", label: "Timesheets", icon: Timer },
  { to: "/todos", label: "To-dos", icon: StickyNote },
] as const;

const ADMIN_NAV = [
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/forms", label: "Form Templates", icon: Layers },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const path = useRouterState().location.pathname;
  const { profile, user, signOut, roles, isSuperAdmin } = useAuth();
  const { activeOrgId, activeOrg, setActiveOrgId, organizations } = useWorkspace();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((x) => !x);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const name = profile?.name || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User";
  const initials = name
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const role = roles.includes("admin")
    ? "admin"
    : roles.includes("manager")
      ? "manager"
      : "employee";
  const displayRole = isSuperAdmin ? "super_admin" : role;
  const primaryOrganization = activeOrg;
  const visibleNav = [...NAV, ...ADMIN_NAV];

  useEffect(() => {
    setProfileName(profile?.name ?? "");
    setProfileUsername(user?.username ?? "");
  }, [profile?.name, user?.username]);

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      const [firstName, ...rest] = profileName.trim().split(/\s+/);
      await user.update({
        firstName: firstName || "",
        lastName: rest.join(" ") || "",
        username: profileUsername.trim() || undefined,
      });
      setProfileOpen(false);
    } finally {
      setSavingProfile(false);
    }
  }

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div
          className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground"
          style={{ background: primaryOrganization?.theme_color ?? undefined }}
        >
          {primaryOrganization?.logo_url ? (
            <img src={primaryOrganization.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Layers className="h-3.5 w-3.5" />
          )}
        </div>
        <span className="min-w-0 truncate font-mono text-[13px] font-semibold tracking-tight">
          {primaryOrganization?.name ?? "SprintStack"}
        </span>
      </div>

      <button
        onClick={() => {
          setPaletteOpen(true);
          onNavigate?.();
        }}
        className="mx-3 mt-3 flex shrink-0 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-sidebar-accent"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Search...</span>
        <span className="kbd shrink-0">Ctrl K</span>
      </button>

      {organizations.length > 0 && (
        <div className="mx-2 mt-3 shrink-0 rounded-md border border-sidebar-border bg-sidebar-accent/20 p-2">
          <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Workspace Environment</span>
            <span className="text-[9px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 capitalize">
              {activeOrg?.kind === "personal" ? "Personal" : "Org"}
            </span>
          </div>
          <Select
            value={activeOrgId || ""}
            onValueChange={(val) => {
              setActiveOrgId(val);
            }}
          >
            <SelectTrigger className="h-8 w-full bg-sidebar border-sidebar-border text-[11px] focus:ring-1 focus:ring-primary py-0 px-2 font-medium">
              <SelectValue placeholder="Select Environment" />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border text-sidebar-foreground">
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: org.theme_color }}
                    />
                    <span>
                      {org.kind === "personal" ? "✨ Personal Workspace" : `📁 ${org.name}`}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="mt-4 min-h-0 flex-1 px-2">
        <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        {visibleNav.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group mt-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="min-w-0 truncate">{item.label}</span>
              {active && <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <UserMenu
          name={name}
          email={profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? ""}
          role={displayRole}
          avatarUrl={profile?.avatar_url ?? null}
          initials={initials}
          onEditProfile={() => setProfileOpen(true)}
          onSignOut={() => signOut()}
        />
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 overflow-hidden border-r border-border bg-sidebar md:flex md:flex-col">
        {sidebarContent()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1 h-8 w-8 md:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebarContent(() => setMobileSidebarOpen(false))}
              </SheetContent>
            </Sheet>
            <span className="text-muted-foreground">SprintStack</span>
            {primaryOrganization && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: primaryOrganization.theme_color }}
                />
                <span className="min-w-0 truncate text-muted-foreground">
                  {primaryOrganization.name}
                </span>
              </>
            )}
            <span className="text-muted-foreground/50">/</span>
            <span className="min-w-0 truncate font-medium">
              {visibleNav.find((n) => path.startsWith(n.to))?.label ?? "Home"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <UserMenu
                compact
                name={name}
                email={profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? ""}
                role={displayRole}
                avatarUrl={profile?.avatar_url ?? null}
                initials={initials}
                onEditProfile={() => setProfileOpen(true)}
                onSignOut={() => signOut()}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-7 gap-2 text-xs text-muted-foreground md:flex"
            >
              <Command className="h-3 w-3" /> Ctrl K
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Username</Label>
              <Input
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="mt-1 h-8"
              />
            </div>
            <div className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] text-muted-foreground">
              Email: {profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "Unavailable"}
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserMenu({
  name,
  email,
  role,
  avatarUrl,
  initials,
  onEditProfile,
  onSignOut,
  compact = false,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  initials: string;
  onEditProfile: () => void;
  onSignOut: () => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-sidebar-accent ${
            compact ? "h-8 w-8 justify-center" : "w-full"
          }`}
        >
          <Avatar className="h-6 w-6 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{role}</div>
                <div className="truncate text-[10px] text-muted-foreground">{email}</div>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="space-y-1 text-xs">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{email}</div>
          <div className="truncate text-[10px] text-muted-foreground">{role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEditProfile} className="text-xs">
          Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut} className="text-xs">
          <LogOut className="mr-2 h-3 w-3" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
