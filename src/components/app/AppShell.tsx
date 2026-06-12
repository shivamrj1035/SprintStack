import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Timer,
  Building2,
  StickyNote,
  Search,
  LogOut,
  Layers,
  ChevronDown,
  Shield,
  Menu,
  Sun,
  Moon,
  Link2,
  MessageSquare,
} from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
import { updateProfile } from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OVERVIEW_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
] as const;

const ORG_WORK_NAV = [
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/timesheets", label: "Timesheets", icon: Timer },
] as const;

const PERSONAL_NAV = [
  { to: "/todos", label: "To-dos", icon: StickyNote },
  { to: "/links", label: "Links & Docs", icon: Link2 },
] as const;

const ADMIN_NAV = [
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/forms", label: "Form Templates", icon: Layers },
] as const;

const SUPER_ADMIN_NAV = [{ to: "/super-admin", label: "Super Admin", icon: Shield }] as const;

const DEFAULT_ORG_MODULES = ["tasks", "projects", "timesheets"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const path = useRouterState().location.pathname;
  const { session, profile, user, signOut, roles, isSuperAdmin } = useAuth();
  const { activeOrgId, activeOrg, setActiveOrgId, organizations } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const isPersonalWs = activeOrg?.kind === "personal";
  const chatOrgFilter = isPersonalWs ? null : (activeOrg?.id ?? null);
  const { conversations: chatConvs } = useConversations(session?.id ?? null, chatOrgFilter);
  const totalUnread = chatConvs.reduce(
    (sum, c) => sum + (c.unreadCounts[session?.id ?? ""] ?? 0),
    0,
  );

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
  const role = activeOrg?.current_user_role ?? "member";
  const displayRole = isSuperAdmin ? "super_admin" : role;
  const primaryOrganization = activeOrg;
  const isPersonalWorkspace = activeOrg?.kind === "personal";
  const visibleNav = [
    ...OVERVIEW_NAV,
    ...ORG_WORK_NAV,
    ...PERSONAL_NAV,
    ...ADMIN_NAV,
    ...SUPER_ADMIN_NAV,
  ];
  const [switchingWorkspaceName, setSwitchingWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(profile?.name ?? "");
  }, [profile?.name]);

  async function saveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({ data: { name: profileName.trim() } });
      setProfileOpen(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSavingProfile(false);
    }
  }

  // Mobile bottom nav items — 4 primary items, then "More" opens the sheet
  const mobileNavItems = isPersonalWorkspace
    ? ([
        { to: "/dashboard", label: "Home", icon: LayoutDashboard },
        { to: "/todos", label: "Todos", icon: StickyNote },
        { to: "/chat", label: "Chat", icon: MessageSquare },
        { to: "/links", label: "Links", icon: Link2 },
      ] as const)
    : ([
        { to: "/dashboard", label: "Home", icon: LayoutDashboard },
        { to: "/tasks", label: "Tasks", icon: ListChecks },
        { to: "/chat", label: "Chat", icon: MessageSquare },
        { to: "/projects", label: "Projects", icon: FolderKanban },
      ] as const);

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border/60 bg-sidebar/40 backdrop-blur-md px-4">
        <div
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/10 transition-all duration-300 hover:scale-105"
          style={{
            background: primaryOrganization?.theme_color ?? undefined,
            border: "1.5px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          {primaryOrganization?.logo_url ? (
            <img src={primaryOrganization.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate font-display text-[13px] font-bold tracking-tight text-foreground">
            {primaryOrganization?.name ?? "SprintStack"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
            {primaryOrganization?.kind === "personal" ? "Personal Space" : "Team Space"}
          </span>
        </div>
      </div>

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
              const selectedOrg = organizations.find((o) => o.id === val);
              if (selectedOrg) {
                setSwitchingWorkspaceName(selectedOrg.name);
                setTimeout(() => {
                  setActiveOrgId(val);
                  setSwitchingWorkspaceName(null);
                }, 3000);
              } else {
                setActiveOrgId(val);
              }
            }}
          >
            <SelectTrigger className="h-8 w-full bg-sidebar border-sidebar-border text-[11px] focus:ring-1 focus:ring-primary py-0 px-2 font-medium">
              <SelectValue placeholder="Select Environment" />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border text-sidebar-foreground z-[90]">
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: org.theme_color }}
                    />
                    <span>{org.kind === "personal" ? "Personal Workspace" : org.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto px-2 space-y-4 scroll-touch">
        {/* Section 1: Overview */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Overview
          </div>
          {OVERVIEW_NAV.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-[13px] transition-colors duration-200 touch-target ${
                  active
                    ? "text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-accent-foreground"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 rounded-md bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 w-full">
                  <item.icon
                    className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${active ? "text-primary" : ""}`}
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                  {item.to === "/chat" && totalUnread > 0 && !active && (
                    <span className="ml-auto h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Section 2: Workspace Work */}
        {!isPersonalWorkspace && (
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Workspace Work
            </div>
            {ORG_WORK_NAV.filter((item) => {
              const mods = activeOrg?.modules ?? DEFAULT_ORG_MODULES;
              if (item.to === "/tasks") return mods.includes("tasks");
              if (item.to === "/projects") return mods.includes("projects");
              if (item.to === "/timesheets") return mods.includes("timesheets");
              return true;
            }).map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-[13px] transition-colors duration-200 touch-target ${
                    active
                      ? "text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute inset-0 rounded-md bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 w-full">
                    <item.icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${active ? "text-primary" : ""}`}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="active-nav-dot"
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Section 3: Personal */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Personal
          </div>
          {PERSONAL_NAV.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-[13px] transition-colors duration-200 touch-target ${
                  active
                    ? "text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-accent-foreground"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 rounded-md bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 w-full">
                  <item.icon
                    className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${active ? "text-primary" : ""}`}
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Super Admin Tools */}
        {isSuperAdmin && (
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Super Admin Tools
            </div>
            {SUPER_ADMIN_NAV.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-[13px] transition-colors duration-200 touch-target ${
                    active
                      ? "text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute inset-0 rounded-md bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 w-full">
                    <item.icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${active ? "text-primary" : ""}`}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="active-nav-dot"
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Administration */}
        {!isSuperAdmin && role === "admin" && (
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Administration
            </div>
            {ADMIN_NAV.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-[13px] transition-colors duration-200 touch-target ${
                    active
                      ? "text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute inset-0 rounded-md bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 w-full">
                    <item.icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${active ? "text-primary" : ""}`}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="active-nav-dot"
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

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
    <>
      {/* Main app shell */}
      <div
        id="app-shell-container"
        className="flex h-dvh w-full bg-background text-foreground origin-top"
      >
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 overflow-hidden border-r border-border bg-sidebar md:flex md:flex-col">
          {sidebarContent()}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-6 bg-sidebar/30 backdrop-blur-sm">
            {/* Mobile: app icon + current page name */}
            <div className="flex items-center gap-2.5 md:hidden">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                style={{ background: primaryOrganization?.theme_color ?? undefined }}
              >
                {primaryOrganization?.logo_url ? (
                  <img
                    src={primaryOrganization.logo_url}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Layers className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="font-display text-sm font-semibold tracking-tight truncate max-w-[160px]">
                {visibleNav.find((n) => path.startsWith(n.to))?.label ?? "SprintStack"}
              </span>
            </div>

            {/* Desktop: breadcrumb */}
            <div className="hidden md:flex min-w-0 items-center gap-2 text-xs">
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

            {/* Right side actions */}
            <div className="flex items-center gap-1.5">
              {/* Mobile: compact user menu */}
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

              {/* Theme toggle */}
              <motion.div
                whileTap={{ scale: 0.85 }}
                whileHover={{ rotate: 15 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? (
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  )}
                </Button>
              </motion.div>

              {/* Search — desktop only */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-all hover:bg-surface-2 cursor-pointer h-8 w-44 shadow-xs"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                <span className="min-w-0 flex-1 truncate">Search...</span>
                <div className="flex items-center gap-0.5 shrink-0 select-none">
                  <span className="kbd text-[9px] px-1 py-0.5 font-mono">⌘K</span>
                  <span className="text-[9px] text-muted-foreground/50">/</span>
                  <span className="kbd text-[9px] px-1 py-0.5 font-mono">Ctrl K</span>
                </div>
              </motion.button>
            </div>
          </header>

          {/* Main content — content-safe-pad adds bottom padding for mobile bottom nav */}
          <main className="min-w-0 flex-1 overflow-y-auto content-safe-pad scroll-touch">
            <AnimatePresence mode="wait">
              <motion.div
                key={path}
                initial={{ opacity: 0, scale: 0.985, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.985, y: -8 }}
                transition={{
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="h-full w-full origin-center"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — floating pill, outside app-shell-container */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] md:hidden pointer-events-none"
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className={`mx-4 mobile-bottom-nav-pill flex h-[60px] items-stretch rounded-[22px] overflow-hidden px-1 transition-[opacity,transform] duration-200 ${
            mobileSidebarOpen
              ? "pointer-events-none opacity-0 scale-95"
              : "pointer-events-auto opacity-100 scale-100"
          }`}
          style={{ marginBottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))" }}
        >
          {mobileNavItems.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const badge = item.to === "/chat" ? totalUnread : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 touch-target select-none"
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="mobile-bottom-active"
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <div className="relative">
                  <item.icon
                    className={`h-5 w-5 transition-colors duration-200 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-semibold tracking-tight leading-none transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button — opens full sidebar sheet */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 touch-target select-none cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
            <span className="text-[9px] font-semibold tracking-tight leading-none text-muted-foreground">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile sidebar sheet — controlled, no SheetTrigger needed */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarContent(() => setMobileSidebarOpen(false))}
        </SheetContent>
      </Sheet>

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Profile dialog */}
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

      {/* Workspace switching fullscreen overlay */}
      <AnimatePresence>
        {switchingWorkspaceName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-primary/30 via-purple-500/20 to-chart-4/30 blur-[100px] animate-pulse pointer-events-none" />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative max-w-sm w-[90%] p-8 rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl text-center select-none"
            >
              <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-[3px] border-t-primary border-r-indigo-500 border-b-transparent border-l-transparent"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="absolute h-8 w-8 rounded-full border-[2px] border-t-chart-4 border-r-transparent border-b-purple-500 border-l-transparent"
                />
              </div>

              <h3 className="mt-6 text-sm font-semibold tracking-tight text-white/95">
                Setting Up Environment
              </h3>
              <p className="mt-1 text-xs text-white/60">Configuring spaces and assets for you...</p>

              <div className="mt-6 px-4 py-2 rounded-xl bg-white/5 border border-white/5 font-display text-[13px] font-bold text-primary tracking-tight">
                {switchingWorkspaceName}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
          className={`flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-sidebar-accent touch-target cursor-pointer ${
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
        <DropdownMenuItem onClick={onEditProfile} className="text-xs cursor-pointer">
          Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut} className="text-xs cursor-pointer">
          <LogOut className="mr-2 h-3 w-3" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
