import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getTasks, getProjects, getTimesheets, getPeople } from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import { statusMeta, priorityMeta, type Status, type Priority } from "@/lib/task-meta";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Clock, Users, TrendingUp } from "lucide-react";
import { format, startOfWeek, addDays, subDays, isAfter, isBefore } from "date-fns";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | string; name: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel border border-border/50 p-2.5 rounded-xl shadow-2xl flex flex-col gap-1 select-none">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          {label}
        </p>
        <p className="text-xs font-extrabold text-foreground leading-none flex items-center gap-1.5 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>
            {payload[0].value} {payload[0].name === "hours" ? "hrs" : "tasks"}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const { user } = useAuth();
  const { activeOrgId } = useWorkspace();

  const tasksQ = useQuery({
    queryKey: ["dash-tasks"],
    queryFn: () => getTasks(),
  });

  const projectsQ = useQuery({
    queryKey: ["dash-projects"],
    queryFn: () => getProjects(),
  });

  const tsQ = useQuery({
    queryKey: ["dash-ts", user?.id],
    queryFn: () => {
      const from = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const to = format(new Date(), "yyyy-MM-dd");
      return getTimesheets({ data: { from, to } });
    },
  });

  const peopleQ = useQuery({
    queryKey: ["people"],
    queryFn: () => getPeople(),
  });

  const allTasks = tasksQ.data ?? [];
  const tasks = allTasks.filter((t) => t.organization_id === activeOrgId);
  const filteredProjects = (projectsQ.data ?? []).filter((p) => p.organization_id === activeOrgId);
  const myTasks = tasks.filter((t) => t.assignee_id === user?.id);
  const overdue = myTasks.filter(
    (t) => t.due_date && isBefore(new Date(t.due_date), new Date()) && t.status !== "done",
  );
  const doneToday = tasks.filter(
    (t) =>
      t.status === "done" && new Date(t.updated_at) >= new Date(new Date().setHours(0, 0, 0, 0)),
  );
  const inProgress = tasks.filter((t) => t.status === "in_progress");

  // Weekly hours
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const hoursByDay = weekDays.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const total = (tsQ.data ?? [])
      .filter((t) => t.user_id === user?.id && t.date === key && t.organization_id === activeOrgId)
      .reduce((s, t) => s + Number(t.hours), 0);
    return { day: format(d, "EEE"), hours: total };
  });

  // Burndown (last 14 days completed vs total open)
  const burndown = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const open = tasks.filter(
      (t) =>
        isBefore(new Date(t.created_at), d) &&
        (t.status !== "done" || isAfter(new Date(t.updated_at), d)),
    ).length;
    return { day: format(d, "MM/dd"), open };
  });

  // Team workload
  const workload = Object.values(
    tasks.reduce<Record<string, { id: string; count: number }>>((acc, t) => {
      if (!t.assignee_id) return acc;
      acc[t.assignee_id] ||= { id: t.assignee_id, count: 0 };
      if (t.status !== "done") acc[t.assignee_id].count++;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const stats = [
    {
      label: "Assigned to me",
      value: myTasks.length,
      icon: Users,
      accent: "text-primary",
      glow: "from-primary/10 to-primary/0",
      borderGlow: "hover:border-primary/30",
    },
    {
      label: "Overdue",
      value: overdue.length,
      icon: AlertTriangle,
      accent: "text-destructive",
      glow: "from-destructive/10 to-destructive/0",
      borderGlow: "hover:border-destructive/30",
    },
    {
      label: "In progress",
      value: inProgress.length,
      icon: Clock,
      accent: "text-warning",
      glow: "from-warning/10 to-warning/0",
      borderGlow: "hover:border-warning/30",
    },
    {
      label: "Done today",
      value: doneToday.length,
      icon: CheckCircle2,
      accent: "text-success",
      glow: "from-success/10 to-success/0",
      borderGlow: "hover:border-success/30",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-display text-foreground">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time visibility across your workspace.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 20, delay: idx * 0.05 }}
            whileHover={{ y: -4, scale: 1.015 }}
            className={`group relative overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-5 backdrop-blur-md shadow-sm transition-all duration-300 ${s.borderGlow}`}
          >
            {/* Soft Ambient Background Glow */}
            <div
              className={`absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.glow} blur-[20px] transition-opacity duration-300`}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-display">
                {s.label}
              </span>
              <div className="rounded-lg bg-surface p-1.5 border border-border/50 transition-colors group-hover:bg-background">
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
            </div>
            <div className="mt-4 font-mono text-3.5xl font-extrabold tracking-tight tabular-nums text-foreground leading-none">
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Burndown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.2 }}
          className="rounded-xl border border-border/80 bg-surface/40 p-5 lg:col-span-2 backdrop-blur-md shadow-sm transition-all duration-350 hover:border-border hover:shadow-md"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold font-display text-foreground tracking-tight">
                Burn-down
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Open tasks, last 14 days
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-surface/50 border border-border/40">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndown} margin={{ left: -20, top: 5, right: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="5 5"
                  stroke="var(--border)"
                  opacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  name="tasks"
                  dataKey="open"
                  stroke="var(--primary)"
                  fill="url(#areaGlow)"
                  strokeWidth={3}
                  activeDot={{
                    r: 5,
                    strokeWidth: 1.5,
                    stroke: "var(--color-background)",
                    fill: "var(--primary)",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.25 }}
          className="rounded-xl border border-border/80 bg-surface/40 p-5 backdrop-blur-md shadow-sm transition-all duration-350 hover:border-border hover:shadow-md"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold font-display text-foreground tracking-tight">
                Weekly hours
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Your logged time
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-surface/50 border border-border/40">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByDay} margin={{ left: -20, top: 5, right: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="5 5"
                  stroke="var(--border)"
                  opacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--border)", opacity: 0.1 }}
                />
                <Bar
                  name="hours"
                  dataKey="hours"
                  fill="url(#barGlow)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* My tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.3 }}
          className="rounded-xl border border-border/80 bg-surface/40 lg:col-span-2 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-350 hover:border-border"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-surface-2/30">
            <div className="text-sm font-bold font-display text-foreground tracking-tight">
              My tasks
            </div>
            <Link
              to="/tasks"
              search={{} as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
              className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-widest"
            >
              All tasks <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-muted-foreground font-medium">
              No tasks assigned to you yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {myTasks.slice(0, 6).map((t, idx) => {
                const sm = statusMeta[t.status as Status] ?? statusMeta.todo;
                const pm = priorityMeta[t.priority as Priority] ?? priorityMeta.medium;
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto] items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-3.5 text-xs hover:bg-surface-2/45 transition-all duration-200"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${sm.dot} shadow-[0_0_8px_currentColor]`}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{t.title}</div>
                      <div className="font-mono text-[9px] text-muted-foreground mt-0.5 tracking-wider">
                        {t.code}
                      </div>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${pm.chip}`}
                    >
                      {pm.label}
                    </span>
                    <span className="hidden md:block text-[10px] text-muted-foreground font-semibold">
                      {t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.div>

        {/* Workload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.35 }}
          className="rounded-xl border border-border/80 bg-surface/40 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-350 hover:border-border"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-surface-2/30">
            <div className="text-sm font-bold font-display text-foreground tracking-tight">
              Team workload
            </div>
            <Users className="h-4 w-4 text-muted-foreground/60" />
          </div>
          {workload.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-muted-foreground font-medium">
              No active assignments yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {workload.map((w, idx) => {
                const overloaded = w.count >= 5;
                const member = (peopleQ.data ?? []).find((p) => p.id === w.id);
                const name = member ? member.name || member.email : "Team Member";
                const initials =
                  name
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "M";
                const colorHash = w.id.charCodeAt(0) % 5;
                const avatarColors = [
                  "bg-blue-500/15 text-blue-500 border-blue-500/20",
                  "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
                  "bg-purple-500/15 text-purple-500 border-purple-500/20",
                  "bg-orange-500/15 text-orange-500 border-orange-500/20",
                  "bg-pink-500/15 text-pink-500 border-pink-500/20",
                ][colorHash];

                return (
                  <motion.li
                    key={w.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex flex-col gap-2 px-5 py-3.5 hover:bg-surface-2/45 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold ${avatarColors}`}
                      >
                        {initials}
                      </div>
                      <span className="flex-1 truncate text-xs font-semibold text-foreground">
                        {name}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums font-bold text-muted-foreground">
                        {w.count} open {w.count === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    {/* Workload heat visual bar */}
                    <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((w.count / 8) * 100, 100)}%` }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        className={`h-full rounded-full ${
                          overloaded
                            ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            : "bg-gradient-to-r from-primary to-indigo-500"
                        }`}
                      />
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>

      {/* Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.4 }}
        className="rounded-xl border border-border/80 bg-surface/40 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-350 hover:border-border mt-4"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-surface-2/30">
          <div className="text-sm font-bold font-display text-foreground tracking-tight">
            Active projects
          </div>
          <Link
            to="/projects"
            search={{} as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            View all
          </Link>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-muted-foreground font-medium">
            No projects yet. Create one in Projects.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border/40 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.slice(0, 6).map((p, idx) => {
              const projTasks = tasks.filter((t) => t.project_id === p.id);
              const done = projTasks.filter((t) => t.status === "done").length;
              const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-surface/30 p-5 hover:bg-surface-2/20 transition-all duration-300 hover:shadow-inner"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ background: p.color, color: p.color }}
                    />
                    <span className="truncate text-xs font-bold text-foreground tracking-tight">
                      {p.name}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>
                      {projTasks.length} {projTasks.length === 1 ? "task" : "tasks"}
                    </span>
                    <span className="font-mono tracking-wider text-foreground">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      className="h-full rounded-full"
                      style={{ background: p.color || "var(--primary)" }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
