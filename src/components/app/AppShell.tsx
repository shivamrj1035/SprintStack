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
  // Stealth explorer icons
  FolderPlus,
  FilePlus,
  Folder,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  Terminal,
  Settings,
  Play,
  Square,
  GitBranch,
} from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { useTheme } from "@/hooks/use-theme";
import { useStealth } from "@/hooks/use-stealth";
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
import { cn } from "@/lib/utils";
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
  const { isStealth, toggleStealth } = useStealth();
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

  const sidebarContent = (onNavigate?: () => void) => {
    if (isStealth) {
      return (
        <div className="flex flex-col h-full bg-[#151515] text-[#d4d4d4] select-none text-[11px] font-mono border-r border-[#2d2d2d] w-full text-left">
          {/* Workspace Title Bar */}
          <div className="flex h-12 items-center justify-between px-3 border-b border-[#2d2d2d] shrink-0">
            <span className="font-bold tracking-tight text-[10px] uppercase text-zinc-500">
              Explorer: ORBIT-OS
            </span>
            <div className="flex items-center gap-2 text-zinc-500">
              <FolderPlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
              <FilePlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
            </div>
          </div>

          {/* Folder Structure */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-1 scroll-touch scrollbar-none px-1">
            {/* Folder: src */}
            <div className="flex items-center gap-1.5 px-2 py-1 text-zinc-500 font-semibold select-none">
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              <Folder className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
              <span>src</span>
            </div>

            <div className="pl-3.5 space-y-0.5">
              <Link
                to="/dashboard"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                  path === "/dashboard" &&
                    "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                )}
              >
                <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>dashboard.tsx</span>
              </Link>

              <Link
                to="/chat"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                  path.startsWith("/chat") &&
                    "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                )}
              >
                <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>chat.tsx</span>
              </Link>

              {!isPersonalWorkspace && activeOrg?.modules?.includes("tasks") && (
                <Link
                  to="/tasks"
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                    path.startsWith("/tasks") &&
                      "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                  )}
                >
                  <FileCode className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>tasks.ts</span>
                </Link>
              )}

              {!isPersonalWorkspace && activeOrg?.modules?.includes("projects") && (
                <Link
                  to="/projects"
                  onClick={onNavigate}
                  search={{ new: undefined }}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                    path.startsWith("/projects") &&
                      "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                  )}
                >
                  <FileJson className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span>projects.json</span>
                </Link>
              )}

              {!isPersonalWorkspace && activeOrg?.modules?.includes("timesheets") && (
                <Link
                  to="/timesheets"
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                    path.startsWith("/timesheets") &&
                      "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                  )}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>timesheets.csv</span>
                </Link>
              )}
            </div>

            {/* Folder: personal */}
            <div className="flex items-center gap-1.5 px-2 py-1 mt-2 text-zinc-500 font-semibold select-none">
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              <Folder className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
              <span>personal</span>
            </div>

            <div className="pl-3.5 space-y-0.5">
              <Link
                to="/todos"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                  path === "/todos" &&
                    "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                )}
              >
                <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>todos.md</span>
              </Link>

              <Link
                to="/links"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                  path === "/links" &&
                    "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                )}
              >
                <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>links.txt</span>
              </Link>
            </div>

            {/* Folder: admin */}
            {(isSuperAdmin || role === "admin") && (
              <>
                <div className="flex items-center gap-1.5 px-2 py-1 mt-2 text-zinc-500 font-semibold select-none">
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  <Folder className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
                  <span>admin</span>
                </div>

                <div className="pl-3.5 space-y-0.5">
                  {!isSuperAdmin && role === "admin" && (
                    <>
                      <Link
                        to="/organizations"
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                          path === "/organizations" &&
                            "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                        )}
                      >
                        <Settings className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>orgs.config</span>
                      </Link>

                      <Link
                        to="/forms"
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                          path.startsWith("/forms") &&
                            "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                        )}
                      >
                        <FileCode className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>forms.schema</span>
                      </Link>
                    </>
                  )}
                  {isSuperAdmin && (
                    <Link
                      to="/super-admin"
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-0.5 text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200 transition-colors",
                        path === "/super-admin" &&
                          "bg-[#2d2d2d] text-white font-medium border-l border-sky-400",
                      )}
                    >
                      <Terminal className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span>super_admin.sh</span>
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User profile file mapping */}
          <div className="shrink-0 border-t border-[#2d2d2d] p-3 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
            <span className="truncate flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>user.gitconfig</span>
            </span>
            <button
              onClick={signOut}
              className="hover:text-zinc-300 text-zinc-500 transition-colors cursor-pointer"
              title="git config --unset user"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return (
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
              <img
                src={primaryOrganization.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Layers className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col min-w-0 text-left">
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
  };

  // Tab Bar for Stealth Mode
  const renderStealthTabs = () => {
    if (!isStealth) return null;

    const tabs = [
      { to: "/dashboard", label: "dashboard.tsx", color: "text-orange-400" },
      { to: "/chat", label: "chat.tsx", color: "text-orange-400" },
      ...(!isPersonalWorkspace && activeOrg?.modules?.includes("tasks")
        ? [{ to: "/tasks", label: "tasks.ts", color: "text-sky-400" }]
        : []),
      ...(!isPersonalWorkspace && activeOrg?.modules?.includes("projects")
        ? [
            {
              to: "/projects",
              label: "projects.json",
              color: "text-yellow-500",
              search: { new: undefined },
            },
          ]
        : []),
      ...(!isPersonalWorkspace && activeOrg?.modules?.includes("timesheets")
        ? [{ to: "/timesheets", label: "timesheets.csv", color: "text-emerald-400" }]
        : []),
      { to: "/todos", label: "todos.md", color: "text-amber-500" },
      { to: "/links", label: "links.txt", color: "text-zinc-400" },
    ];

    return (
      <div className="flex bg-[#181818] border-b border-[#2d2d2d] overflow-x-auto select-none scrollbar-none h-[35px] shrink-0 font-mono text-xs">
        {tabs.map((tab) => {
          const isActive = path === tab.to || (tab.to === "/chat" && path.startsWith("/chat"));
          return (
            <Link
              key={tab.to}
              to={tab.to}
              search={"search" in tab ? tab.search : undefined}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 border-r border-[#2d2d2d] text-zinc-400 hover:bg-[#202020] transition-all shrink-0 select-none",
                isActive
                  ? "bg-[#1e1e1e] text-white border-t border-sky-400 font-medium"
                  : "bg-[#181818]/60",
              )}
            >
              <FileCode className={cn("h-3.5 w-3.5", tab.color)} />
              <span>{tab.label}</span>
              <span className="text-[9px] hover:text-red-400 transition-colors ml-1 w-3 h-3 flex items-center justify-center rounded-full">
                ×
              </span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Main app shell */}
      <div
        id="app-shell-container"
        className={cn(
          "flex h-dvh w-full bg-background text-foreground origin-top overflow-hidden flex-col",
          isStealth && "stealth",
        )}
      >
        <div className="flex flex-1 min-w-0 overflow-hidden h-full">
          {/* Desktop sidebar */}
          <aside
            className={cn(
              "sticky top-0 hidden h-full w-56 shrink-0 overflow-hidden border-r border-border md:flex md:flex-col",
              isStealth ? "bg-[#151515]" : "bg-sidebar",
            )}
          >
            {sidebarContent()}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
            {/* Header */}
            <header
              className={cn(
                "flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-6 backdrop-blur-sm",
                isStealth ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-sidebar/30",
              )}
            >
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

                {/* Stealth Run toggle */}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleStealth}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title={isStealth ? "Stop Process & Return to OrbitOS" : "Run Code Workspace"}
                  >
                    {isStealth ? (
                      <Square className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 animate-pulse" />
                    )}
                  </Button>
                </motion.div>

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

            {/* Tabs (only in stealth) */}
            {renderStealthTabs()}

            {/* Main content — content-safe-pad adds bottom padding for mobile bottom nav */}
            <main className="min-w-0 flex-1 overflow-y-auto content-safe-pad scroll-touch bg-background">
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

        {/* Status Bar */}
        {isStealth && (
          <div className="h-[22px] bg-[#007acc] text-white flex items-center justify-between px-3 select-none text-[10px] font-mono shrink-0 z-[100]">
            <div className="flex items-center gap-3 h-full">
              <div className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">
                <GitBranch className="h-3 w-3" />
                <span>main</span>
              </div>
              <div className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">
                <span>Prettier: checked</span>
              </div>
            </div>

            <div className="flex items-center gap-3 h-full">
              <span className="hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">
                Ln 14, Col 42
              </span>
              <span className="hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">
                Spaces: 2
              </span>
              <span className="hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">UTF-8</span>
              <span className="hover:bg-white/10 px-1.5 h-full cursor-pointer py-0.5">
                TypeScript JSX
              </span>
            </div>
          </div>
        )}
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
