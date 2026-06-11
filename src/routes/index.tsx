import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Command, Layers, Timer, Zap } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForceLightMode } from "@/hooks/use-force-light-mode";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  useForceLightMode();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Premium ambient glows */}
      <div className="absolute inset-0 grid-bg opacity-[0.06] pointer-events-none" />
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-primary/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Floating glassmorphic header */}
      <header className="sticky top-0 z-50 w-full glass border-b border-border/40 px-6 py-3.5 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">SprintStack</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs h-8">
              Sign in
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="sm"
              className="text-xs h-8 font-semibold shadow-md shadow-primary/10 hover:shadow-primary/25 transition-all"
            >
              Get started <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-2/40 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/50 cursor-default animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono tracking-wider font-semibold text-[10px] uppercase">
              v0.1
            </span>{" "}
            — built for dev teams who hate Jira
          </div>

          {/* Hero Headings */}
          <h1 className="mt-8 text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.05] text-foreground">
            The execution OS
            <br />
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-chart-4 bg-clip-text text-transparent drop-shadow-sm">
              for tech teams.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground font-medium leading-relaxed">
            Dense, keyboard-first, dashboard-driven. Plan sprints, ship tasks, log time — all
            without clicking through twenty pages.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/login">
              <Button
                size="lg"
                className="font-semibold text-sm px-6 h-12 shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Open SprintStack <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="font-mono text-xs px-6 h-12 border-border/80 hover:bg-surface-2/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Command className="mr-2.5 h-4 w-4 text-primary" /> Press ⌘K anywhere
            </Button>
          </div>
        </motion.div>

        {/* Dynamic Card Feature Grid */}
        <motion.div
          className="mt-28 grid grid-cols-1 gap-5 md:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
        >
          {[
            {
              icon: Zap,
              title: "Instant",
              body: "Inline edits, no modals, no waiting.",
              color: "from-amber-500/20 to-orange-500/5",
            },
            {
              icon: Layers,
              title: "Dense",
              body: "Spreadsheet feel for tasks. Real estate matters.",
              color: "from-blue-500/20 to-indigo-500/5",
            },
            {
              icon: Timer,
              title: "Logged",
              body: "Timers, manual logs, weekly utilization.",
              color: "from-emerald-500/20 to-teal-500/5",
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-surface/50 p-7 transition-colors duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 backdrop-blur-sm"
            >
              {/* Highlight Background Glow */}
              <div
                className={`absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br ${f.color} blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 border border-border/60 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shadow-sm">
                <f.icon className="h-5 w-5" />
              </div>

              <h3 className="relative z-10 mt-5 font-display text-lg font-bold text-foreground">
                {f.title}
              </h3>
              <p className="relative z-10 mt-2 text-xs text-muted-foreground leading-normal font-medium">
                {f.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
