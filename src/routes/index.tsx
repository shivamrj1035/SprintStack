import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Command, Layers, Timer, Zap } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">SprintStack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm">
              Get started <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          v0.1 — built for dev teams who hate Jira
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
          The execution OS
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-chart-4 bg-clip-text text-transparent">
            for tech teams.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Dense, keyboard-first, dashboard-driven. Plan sprints, ship tasks, log time — all without
          clicking through twenty pages.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/login">
            <Button size="lg" className="font-medium">
              Open SprintStack <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="font-mono">
            <Command className="mr-2 h-4 w-4" /> Press ⌘K anywhere
          </Button>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {[
            { icon: Zap, title: "Instant", body: "Inline edits, no modals, no waiting." },
            {
              icon: Layers,
              title: "Dense",
              body: "Spreadsheet feel for tasks. Real estate matters.",
            },
            { icon: Timer, title: "Logged", body: "Timers, manual logs, weekly utilization." },
          ].map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <f.icon className="h-4 w-4 text-primary" />
              <div className="mt-3 text-sm font-medium">{f.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{f.body}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
