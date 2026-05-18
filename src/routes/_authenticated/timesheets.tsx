import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format, startOfWeek, addDays, subDays, addWeeks } from "date-fns";

export const Route = createFileRoute("/_authenticated/timesheets")({
  component: TimesheetsPage,
  validateSearch: (s) => ({ new: (s.new as string) ?? undefined }),
});

function TimesheetsPage() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const weekStart = useMemo(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset), [weekOffset]);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => { if (search.new) setOpen(true); }, [search.new]);

  const fromKey = format(days[0], "yyyy-MM-dd");
  const toKey = format(days[6], "yyyy-MM-dd");

  const tsQ = useQuery({
    queryKey: ["ts", user?.id, fromKey, toKey],
    queryFn: async () =>
      (await supabase.from("timesheets").select("*,tasks(title,code)").eq("user_id", user?.id ?? "").gte("date", fromKey).lte("date", toKey).order("date")).data ?? [],
  });
  const tasksQ = useQuery({
    queryKey: ["tasks-for-ts"],
    queryFn: async () => (await supabase.from("tasks").select("id,title,code")).data ?? [],
  });

  const byDay = days.map((d) => {
    const k = format(d, "yyyy-MM-dd");
    const entries = (tsQ.data ?? []).filter((t) => t.date === k);
    const total = entries.reduce((s, t) => s + Number(t.hours), 0);
    return { date: d, key: k, entries, total };
  });
  const weekTotal = byDay.reduce((s, d) => s + d.total, 0);

  // form
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState(1);
  const [taskId, setTaskId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);

  async function log() {
    if (hours <= 0) { toast.error("Hours must be > 0"); return; }
    const { error } = await supabase.from("timesheets").insert({
      user_id: user?.id, hours, date, notes: notes || null,
      billable, task_id: taskId === "none" ? null : taskId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Time logged");
    setHours(1); setNotes(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["ts"] });
    qc.invalidateQueries({ queryKey: ["dash-ts"] });
  }

  async function del(id: string) {
    const { error } = await supabase.from("timesheets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ts"] });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Timesheets</h1>
          <p className="text-xs text-muted-foreground">Week of {format(weekStart, "MMM d, yyyy")} · {weekTotal.toFixed(1)}h logged</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset - 1)} className="h-7 text-xs">← Prev</Button>
          <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)} className="h-7 text-xs">Today</Button>
          <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset + 1)} className="h-7 text-xs">Next →</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs"><Plus className="mr-1 h-3 w-3" /> Log time</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-sm">Log time</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-8 text-xs" /></div>
                  <div><Label className="text-xs">Hours</Label><Input type="number" min={0.25} step={0.25} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 h-8 text-xs" /></div>
                </div>
                <div>
                  <Label className="text-xs">Task</Label>
                  <Select value={taskId} onValueChange={setTaskId}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No task</SelectItem>
                      {(tasksQ.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.code} · {t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className="mt-1" /></div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="b" className="text-xs">Billable</Label>
                  <Switch id="b" checked={billable} onCheckedChange={setBillable} />
                </div>
              </div>
              <DialogFooter><Button size="sm" onClick={log}>Log</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-32 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider">Day</th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider">Entries</th>
              <th className="w-24 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider">Hours</th>
              <th className="w-20 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {byDay.map((d) => (
              <tr key={d.key} className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{format(d.date, "EEE")}</div>
                  <div className="text-[10px] text-muted-foreground">{format(d.date, "MMM d")}</div>
                </td>
                <td className="px-3 py-2">
                  {d.entries.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {d.entries.map((e) => (
                        <li key={e.id} className="group flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{Number(e.hours).toFixed(2)}h</span>
                          {e.billable && <span className="rounded bg-success/15 px-1 py-0.5 text-[9px] text-success">$</span>}
                          <span className="truncate">
                            {e.tasks ? <span className="font-mono text-[10px] text-muted-foreground">{e.tasks.code}</span> : null} {e.notes ?? (e.tasks?.title ?? "—")}
                          </span>
                          <button onClick={() => del(e.id)} className="ml-auto opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{d.total.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${d.total === 0 ? "bg-muted text-muted-foreground" : d.total >= 8 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {d.total === 0 ? "Empty" : d.total >= 8 ? "Full" : "Partial"}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-surface-2">
              <td colSpan={2} className="px-3 py-2 text-xs font-medium">Week total</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums">{weekTotal.toFixed(1)}h</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
