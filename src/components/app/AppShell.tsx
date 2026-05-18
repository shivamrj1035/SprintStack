import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, ListChecks, FolderKanban, Timer, Command,
  Search, LogOut, Layers, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "./CommandPalette";
import { useState, useEffect, type ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/timesheets", label: "Timesheets", icon: Timer },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, user, signOut, roles } = useAuth();

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

  const name = profile?.name || user?.email?.split("@")[0] || "User";
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const role = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "employee";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <span className="font-mono text-[13px] font-semibold tracking-tight">SprintStack</span>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-sidebar-accent"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1">Search…</span>
          <span className="kbd">⌘K</span>
        </button>

        <nav className="mt-4 flex-1 px-2">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workspace</div>
          {NAV.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group mt-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${active ? "text-primary" : ""}`} />
                {item.label}
                {active && <span className="ml-auto h-1 w-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-sidebar-accent">
                <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/20 text-[10px] text-primary">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{role}</div>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-xs">
                <LogOut className="mr-2 h-3 w-3" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">SprintStack</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium">{NAV.find((n) => path.startsWith(n.to))?.label ?? "Home"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPaletteOpen(true)} className="hidden h-7 gap-2 text-xs text-muted-foreground md:flex">
              <Command className="h-3 w-3" /> ⌘K
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
