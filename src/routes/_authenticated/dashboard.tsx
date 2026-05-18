import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { statusMeta, priorityMeta, type Status, type Priority } from "@/lib/task-meta";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Clock, Users, TrendingUp } from "lucide-react";
import { format, startOfWeek, addDays, subDays, isAfter, isBefore } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  const tasksQ = useQuery({
    queryKey: ["dash-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["dash-projects"],
    queryFn: async () => (await supabase.from("projects").select("*")).data ?? [],
  });

  const tsQ = useQuery({
    queryKey: ["dash-ts", user?.id],
    queryFn: async () => {
      const from = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const { data } = await supabase.from("timesheets").select("*").gte("date", from);
      return data ?? [];
    },
  });

  const tasks = tasksQ.data ?? [];
  const myTasks = tasks.filter((t) => t.assignee_id === user?.id);
  const overdue = myTasks.filter((t) => t.due_date && isBefore(new Date(t.due_date), new Date()) && t.status !== "done");
  const doneToday = tasks.filter((t) => t.status === "done" && new Date(t.updated_at) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const inProgress = tasks.filter((t) => t.status === "in_progress");

  // Weekly hours
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const hoursByDay = weekDays.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const total = (tsQ.data ?? []).filter((t) => t.user_id === user?.id && t.date === key).reduce((s, t) => s + Number(t.hours), 0);
    return { day: format(d, "EEE"), hours: total };
  });

  // Burndown (last 14 days completed vs total open)
  const burndown = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const open = tasks.filter((t) => isBefore(new Date(t.created_at), d) && (t.status !== "done" || isAfter(new Date(t.updated_at), d))).length;
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
  ).sort((a, b) => b.count - a.count).slice(0, 6);

  const stats = [
    { label: "Assigned to me", value: myTasks.length, icon: Users, accent: "text-primary" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, accent: "text-destructive" },
    { label: "In progress", value: inProgress.length, icon: Clock, accent: "text-warning" },
    { label: "Done today", value: doneToday.length, icon: CheckCircle2, accent: "text-success" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time visibility across your workspace.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <s.icon className={`h-3.5 w-3.5 ${s.accent}`} />
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Burndown */}
        <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Burn-down</div>
              <div className="text-[11px] text-muted-foreground">Open tasks, last 14 days</div>
            </div>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndown} margin={{ left: -20, top: 5, right: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11, borderRadius: 6 }} />
                <Area dataKey="open" stroke="var(--primary)" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly hours */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Weekly hours</div>
              <div className="text-[11px] text-muted-foreground">Your logged time</div>
            </div>
            <Clock className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByDay} margin={{ left: -20, top: 5, right: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11, borderRadius: 6 }} />
                <Bar dataKey="hours" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* My tasks */}
        <div className="rounded-lg border border-border bg-surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-sm font-medium">My tasks</div>
            <Link to="/tasks" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">All tasks <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">No tasks assigned to you yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.slice(0, 6).map((t) => {
                const sm = statusMeta[t.status as Status] ?? statusMeta.todo;
                const pm = priorityMeta[t.priority as Priority] ?? priorityMeta.medium;
                return (
                  <li key={t.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 text-xs hover:bg-surface-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                    <div className="min-w-0">
                      <div className="truncate">{t.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{t.code}</div>
                    </div>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${pm.chip}`}>{pm.label}</span>
                    <span className="text-[10px] text-muted-foreground">{t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Workload */}
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-sm font-medium">Team workload</div>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {workload.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">No active assignments yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {workload.map((w) => {
                const overloaded = w.count >= 5;
                return (
                  <li key={w.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${overloaded ? "bg-destructive" : "bg-success"}`} />
                    <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">{w.id.slice(0, 8)}</span>
                    <span className="font-mono tabular-nums">{w.count} open</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-sm font-medium">Active projects</div>
          <Link to="/projects" className="text-[11px] text-muted-foreground hover:text-primary">View all</Link>
        </div>
        {(projectsQ.data ?? []).length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">No projects yet. Create one in Projects.</div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {(projectsQ.data ?? []).slice(0, 6).map((p) => {
              const projTasks = tasks.filter((t) => t.project_id === p.id);
              const done = projTasks.filter((t) => t.status === "done").length;
              const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
              return (
                <div key={p.id} className="bg-surface p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="truncate text-xs font-medium">{p.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{projTasks.length} tasks</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
