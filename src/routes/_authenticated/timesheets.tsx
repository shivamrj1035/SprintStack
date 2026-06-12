import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  getTimesheets,
  getTasks,
  createTimesheet,
  deleteTimesheet,
  updateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  getProjects,
  getCustomFormForProject,
  checkProjectFormStatus,
  getPeople,
} from "@/server-fns/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, Users } from "lucide-react";
import { format, startOfWeek, addDays, subDays, addWeeks } from "date-fns";

interface CustomField {
  id?: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  category?: string;
  width?: string;
}

interface TimesheetDbEntry {
  id: string;
  user_id: string;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;
  date: string;
  hours: string;
  billable: boolean;
  notes: string | null;
  status: string;
  custom_values: Record<string, string | number | boolean | null | undefined>;
  created_at: Date;
  tasks: {
    title: string;
    code: string;
  } | null;
}

export const Route = createFileRoute("/_authenticated/timesheets")({
  component: TimesheetsPage,
  validateSearch: (s) => ({ new: (s.new as string) ?? undefined }),
});

function FormSkeletonLoader() {
  return (
    <div className="w-full py-8 flex flex-col items-center justify-center space-y-4">
      <div className="relative w-full max-w-[280px] h-32 flex items-center justify-center">
        {/* Animated glowing background */}
        <div className="absolute inset-0 bg-primary/5 blur-xl rounded-xl animate-pulse" />

        <svg
          className="w-full h-full text-muted-foreground/15"
          viewBox="0 0 300 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {/* Animated drawing strokes using CSS animation */}
          {/* Header path */}
          <path
            d="M 10 10 L 290 10 L 290 25 L 10 25 Z"
            className="animate-draw-stroke stroke-primary/30"
          />
          {/* Left field path */}
          <path
            d="M 10 40 L 140 40 L 140 60 L 10 60 Z"
            className="animate-draw-stroke"
            style={{ animationDelay: "0.2s" }}
          />
          {/* Right field path */}
          <path
            d="M 160 40 L 290 40 L 290 60 L 160 60 Z"
            className="animate-draw-stroke"
            style={{ animationDelay: "0.4s" }}
          />
          {/* Full area path */}
          <path
            d="M 10 75 L 290 75 L 290 105 L 10 105 Z"
            className="animate-draw-stroke"
            style={{ animationDelay: "0.6s" }}
          />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <span className="text-xs font-semibold text-foreground/85 animate-pulse">
          Loading Custom Form Template...
        </span>
        <p className="text-[10px] text-muted-foreground">Mapping customized project layout</p>
      </div>
    </div>
  );
}

function TimesheetsPage() {
  const search = Route.useSearch();
  const { user, roles, isSuperAdmin } = useAuth();
  const canViewTeam = isSuperAdmin || roles.includes("super_admin") || roles.includes("admin");
  const { activeOrgId, activeOrg } = useWorkspace();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [teamView, setTeamView] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [editEntry, setEditEntry] = useState<TimesheetDbEntry | null>(null);
  const [editHours, setEditHours] = useState(1);
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editBillable, setEditBillable] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset],
  );
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (search.new) setOpen(true);
  }, [search.new]);

  const fromKey = format(days[0], "yyyy-MM-dd");
  const toKey = format(days[6], "yyyy-MM-dd");

  const tsQ = useQuery({
    queryKey: ["ts", user?.id, fromKey, toKey, teamView ? selectedUserId : null],
    queryFn: () =>
      getTimesheets({
        data: {
          from: fromKey,
          to: toKey,
          ...(teamView && selectedUserId ? { user_id: selectedUserId } : {}),
        },
      }),
  });
  const peopleQ = useQuery({
    queryKey: ["people"],
    queryFn: () => getPeople(),
    enabled: canViewTeam,
  });
  const tasksQ = useQuery({
    queryKey: ["tasks-for-ts"],
    queryFn: () => getTasks(),
  });
  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const byDay = days.map((d) => {
    const k = format(d, "yyyy-MM-dd");
    const entries = ((tsQ.data ?? []) as TimesheetDbEntry[]).filter(
      (t) => t.date === k && t.organization_id === activeOrgId,
    );
    const total = entries.reduce((s, t) => s + Number(t.hours), 0);
    return { date: d, key: k, entries, total };
  });
  const weekTotal = byDay.reduce((s, d) => s + d.total, 0);

  // form
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState(1);
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);
  const [customValues, setCustomValues] = useState<Record<string, string | number | boolean>>({});
  const [logging, setLogging] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const customFormQ = useQuery({
    queryKey: ["custom-form-project", projectId],
    queryFn: () => getCustomFormForProject({ data: { project_id: projectId } }),
    enabled: projectId !== "none" && projectId !== "",
  });
  const customFields =
    (customFormQ.data as { fields?: CustomField[] } | null | undefined)?.fields ?? [];

  const formStatusQ = useQuery({
    queryKey: ["project-form-status", projectId],
    queryFn: () => checkProjectFormStatus({ data: { project_id: projectId } }),
    enabled: projectId !== "none" && projectId !== "",
  });
  const hasPublishedForm = projectId === "none" || (formStatusQ.data?.hasPublishedForm ?? true);

  const filteredTasks = useMemo(() => {
    const list = tasksQ.data ?? [];
    if (projectId === "none" || !projectId) return list;
    return list.filter((t) => t.project_id === projectId);
  }, [tasksQ.data, projectId]);

  const onProjectChange = (val: string) => {
    setProjectId(val);
    setTaskId("none");
    setCustomValues({});
  };

  const onTaskChange = (val: string) => {
    setTaskId(val);
    if (val !== "none") {
      const task = (tasksQ.data ?? []).find((t) => t.id === val);
      if (task?.project_id) {
        setProjectId(task.project_id);
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep(1);
      setProjectId("");
      setTaskId("none");
      setCustomValues({});
      setHours(1);
      setNotes("");
      setBillable(true);
    }
  };

  async function log() {
    let finalHours = hours;
    let finalDate = date;
    let finalNotes = notes || null;

    if (projectId !== "none" && customFields.length > 0) {
      // Find effort hours field (e.g. effort, hours, time)
      const hoursField = customFields.find((f) => {
        const label = f.label.toLowerCase();
        return label.includes("hour") || label.includes("effort") || label.includes("time");
      });
      if (hoursField) {
        const fieldKey = hoursField.id || hoursField.label;
        const val = Number(customValues[fieldKey]);
        if (!isNaN(val) && val > 0) {
          finalHours = val;
        } else {
          toast.error(`Please provide a valid number of hours in "${hoursField.label}"`);
          return;
        }
      }

      // Find date field
      const dateField = customFields.find((f) => {
        const label = f.label.toLowerCase();
        return f.type === "date" || label.includes("date");
      });
      if (dateField) {
        const fieldKey = dateField.id || dateField.label;
        const val = customValues[fieldKey];
        if (val) {
          finalDate = String(val);
        } else if (dateField.required) {
          toast.error(`"${dateField.label}" is required`);
          return;
        }
      }

      // Find notes/description/remarks field
      const notesField = customFields.find((f) => {
        const label = f.label.toLowerCase();
        return (
          label.includes("remark") ||
          label.includes("note") ||
          label.includes("description") ||
          label.includes("comment")
        );
      });
      if (notesField) {
        const fieldKey = notesField.id || notesField.label;
        const val = customValues[fieldKey];
        if (val) {
          finalNotes = String(val);
        }
      }

      // Perform validation for other required fields
      for (const field of customFields) {
        const fieldKey = field.id || field.label;
        if (field.type === "section_header") continue;
        if (field.required && !customValues[fieldKey]) {
          toast.error(`"${field.label}" is required`);
          return;
        }
      }
    } else {
      if (finalHours <= 0) {
        toast.error("Hours must be > 0");
        return;
      }
    }

    const submittedCustomValues: Record<string, string | number | boolean> = {};
    for (const field of customFields) {
      if (field.type === "section_header") continue;
      const fieldKey = field.id || field.label;
      const val = customValues[fieldKey];
      if (val !== undefined && val !== "") {
        submittedCustomValues[field.label] = val;
      }
    }

    setLogging(true);
    try {
      await createTimesheet({
        data: {
          hours: finalHours,
          date: finalDate,
          notes: finalNotes,
          billable,
          task_id: taskId === "none" ? null : taskId,
          project_id: projectId === "none" ? null : projectId,
          custom_values: submittedCustomValues,
        },
      });
      toast.success("Time logged");
      setHours(1);
      setNotes("");
      setProjectId("");
      setTaskId("none");
      setCustomValues({});
      setStep(1);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ts"] });
      qc.invalidateQueries({ queryKey: ["dash-ts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log time");
    } finally {
      setLogging(false);
    }
  }

  async function submitEntry(id: string) {
    setSubmittingIds((s) => new Set(s).add(id));
    try {
      await submitTimesheet({ data: id });
      toast.success("Entry submitted for approval");
      qc.invalidateQueries({ queryKey: ["ts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit entry");
    } finally {
      setSubmittingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function approveEntry(id: string) {
    setApprovingIds((s) => new Set(s).add(id));
    try {
      await approveTimesheet({ data: { id } });
      toast.success("Entry approved");
      qc.invalidateQueries({ queryKey: ["ts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve entry");
    } finally {
      setApprovingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function rejectEntry(id: string) {
    setApprovingIds((s) => new Set(s).add(id));
    try {
      await rejectTimesheet({ data: { id } });
      toast.success("Entry rejected");
      qc.invalidateQueries({ queryKey: ["ts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject entry");
    } finally {
      setApprovingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  function openEditEntry(e: TimesheetDbEntry) {
    setEditEntry(e);
    setEditHours(Number(e.hours));
    setEditDate(e.date);
    setEditNotes(e.notes ?? "");
    setEditBillable(e.billable);
  }

  async function saveEditEntry() {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      await updateTimesheet({
        data: {
          id: editEntry.id,
          hours: editHours,
          date: editDate,
          notes: editNotes || null,
          billable: editBillable,
        },
      });
      toast.success("Entry updated");
      setEditEntry(null);
      qc.invalidateQueries({ queryKey: ["ts"] });
      qc.invalidateQueries({ queryKey: ["dash-ts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  }

  async function del(id: string) {
    setDeletingIds((current) => new Set(current).add(id));
    try {
      await deleteTimesheet({ data: id });
      qc.invalidateQueries({ queryKey: ["ts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete entry");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Timesheets</h1>
          <p className="text-xs text-muted-foreground">
            Week of {format(weekStart, "MMM d, yyyy")} · {weekTotal.toFixed(1)}h logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canViewTeam && (
            <>
              <Button
                size="sm"
                variant={teamView ? "default" : "outline"}
                onClick={() => {
                  setTeamView((v) => !v);
                  setSelectedUserId("");
                }}
                className="h-7 gap-1 text-xs"
              >
                <Users className="h-3 w-3" />
                Team
              </Button>
              {teamView && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All members</SelectItem>
                    {(peopleQ.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="h-7 text-xs"
          >
            ← Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekOffset(0)}
            className="h-7 text-xs"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="h-7 text-xs"
          >
            Next →
          </Button>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Log time
              </Button>
            </DialogTrigger>
            <DialogContent
              className={`max-h-[90vh] overflow-y-auto ${step === 2 && (customFormQ.isLoading || customFields.length > 0) ? "max-w-2xl" : "max-w-md"}`}
            >
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">
                  {step === 1
                    ? "Log Time: Select Workspace / Project"
                    : `Log Time: ${projectId === "none" ? "Personal Use" : projectsQ.data?.find((p) => p.id === projectId)?.name || "Project"}`}
                </DialogTitle>
              </DialogHeader>

              {step === 1 ? (
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Project or Workspace</Label>
                    <Select value={projectId} onValueChange={onProjectChange}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select where to log time..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        {activeOrg?.kind === "personal" && (
                          <SelectItem value="none" className="text-xs font-semibold text-primary">
                            ✨ Personal Workspace (No Project)
                          </SelectItem>
                        )}
                        {(projectsQ.data ?? [])
                          .filter((p) => p.organization_id === activeOrgId)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              📁 {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!hasPublishedForm && projectId && projectId !== "none" && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                      <strong className="font-semibold">No Published Form Template.</strong>
                      <br />
                      This project requires a published form template before you can log time.
                      Contact your admin.
                    </div>
                  )}

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!projectId || (!hasPublishedForm && projectId !== "none")}
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto text-xs"
                    >
                      Continue
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-muted/40 p-2 rounded border border-border/60">
                    <div className="text-[11px] text-muted-foreground">
                      Logging to:{" "}
                      <span className="font-semibold text-foreground">
                        {projectId === "none"
                          ? "Personal Workspace"
                          : projectsQ.data?.find((p) => p.id === projectId)?.name || "Project"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="h-6 px-2 text-[10px] text-primary hover:underline hover:bg-transparent"
                    >
                      Change
                    </Button>
                  </div>

                  {!(
                    projectId !== "none" &&
                    (customFormQ.isLoading || customFields.length > 0)
                  ) && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Hours</Label>
                          <Input
                            type="number"
                            min={0.25}
                            step={0.25}
                            value={hours}
                            onChange={(e) => setHours(Number(e.target.value))}
                            className="mt-1 h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Task</Label>
                        <Select value={taskId} onValueChange={onTaskChange}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="Select a task" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No task</SelectItem>
                            {filteredTasks.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.code} · {t.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {projectId !== "none" && customFormQ.isLoading && <FormSkeletonLoader />}

                  {projectId !== "none" && customFields.length > 0 && (
                    <div className="border-t border-border pt-3 mt-3 space-y-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Custom Form Details
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-2.5">
                        {customFields.map((field) => {
                          const fieldKey = field.id || field.label;
                          const val = customValues[fieldKey] ?? "";
                          const widthClass =
                            {
                              "100": "w-full",
                              "50": "w-[calc(50%-6px)]",
                              "33": "w-[calc(33.33%-8px)]",
                              "25": "w-[calc(25%-9px)]",
                            }[field.width || "100"] || "w-full";

                          if (field.type === "section_header") {
                            return (
                              <div
                                key={fieldKey}
                                className="w-full border-b border-border/60 pb-1 mt-2 mb-1"
                              >
                                <span className="text-xs font-bold text-primary uppercase tracking-wide font-sans">
                                  {field.label}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={fieldKey} className={`space-y-1 ${widthClass}`}>
                              <Label className="text-xs">
                                {field.label}{" "}
                                {field.required && <span className="text-destructive">*</span>}
                              </Label>
                              {field.type === "select" || field.type === "dropdown" ? (
                                <Select
                                  value={String(val)}
                                  onValueChange={(v) =>
                                    setCustomValues((prev) => ({ ...prev, [fieldKey]: v }))
                                  }
                                >
                                  <SelectTrigger className="mt-1 h-8 text-xs bg-background">
                                    <SelectValue
                                      placeholder={field.placeholder || "Select option"}
                                    />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border-border">
                                    {(field.options || []).map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : field.type === "radio" ? (
                                <div className="flex gap-4 pt-1.5">
                                  {(field.options || []).map((opt) => (
                                    <label
                                      key={opt}
                                      className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        name={fieldKey}
                                        value={opt}
                                        checked={val === opt}
                                        onChange={() =>
                                          setCustomValues((prev) => ({ ...prev, [fieldKey]: opt }))
                                        }
                                        className="h-3.5 w-3.5 border-border"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : field.type === "checkbox" ? (
                                <div className="flex items-center gap-2 pt-1.5">
                                  <input
                                    type="checkbox"
                                    checked={!!val}
                                    onChange={(e) =>
                                      setCustomValues((prev) => ({
                                        ...prev,
                                        [fieldKey]: e.target.checked,
                                      }))
                                    }
                                    className="rounded border-border h-4 w-4"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    Confirm selection
                                  </span>
                                </div>
                              ) : field.type === "textarea" || field.type === "content_block" ? (
                                <Textarea
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }))
                                  }
                                  placeholder={field.placeholder || "Enter details..."}
                                  rows={2}
                                  className="mt-1 text-xs"
                                />
                              ) : field.type === "number" ? (
                                <Input
                                  type="number"
                                  value={typeof val === "number" ? val : (val as string)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]:
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    }))
                                  }
                                  placeholder={field.placeholder || "0"}
                                  className="mt-1 h-8 text-xs"
                                />
                              ) : field.type === "date" ? (
                                <Input
                                  type="date"
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-8 text-xs"
                                />
                              ) : field.type === "time" ? (
                                <Input
                                  type="time"
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-8 text-xs"
                                />
                              ) : field.type === "datetime" ? (
                                <Input
                                  type="datetime-local"
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-8 text-xs"
                                />
                              ) : field.type === "signature" ? (
                                <div className="border border-border rounded p-2 bg-muted/20 relative mt-1 w-full">
                                  <Input
                                    type="text"
                                    placeholder="Type signature name to sign..."
                                    value={String(val)}
                                    onChange={(e) =>
                                      setCustomValues((prev) => ({
                                        ...prev,
                                        [fieldKey]: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-xs bg-background"
                                  />
                                  <div className="text-[9px] text-muted-foreground mt-1 flex justify-between">
                                    <span>Type your name to authorize.</span>
                                    {val && (
                                      <span className="text-emerald-500 font-semibold font-mono">
                                        Signed ✓
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : field.type === "geolocation" ? (
                                <div className="flex gap-1.5 mt-1 w-full">
                                  <Input
                                    type="text"
                                    readOnly
                                    placeholder="GPS (latitude, longitude)"
                                    value={String(val)}
                                    className="h-8 text-xs bg-muted/40 cursor-not-allowed flex-1"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      navigator.geolocation.getCurrentPosition(
                                        (pos) => {
                                          setCustomValues((prev) => ({
                                            ...prev,
                                            [fieldKey]: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
                                          }));
                                          toast.success("Geolocation acquired!");
                                        },
                                        (err) => {
                                          toast.error(
                                            "Failed to acquire geolocation: " + err.message,
                                          );
                                        },
                                      );
                                    }}
                                    className="h-8 text-xs shrink-0"
                                  >
                                    GPS
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  type="text"
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomValues((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }))
                                  }
                                  placeholder={
                                    field.placeholder || `Enter ${field.label.toLowerCase()}...`
                                  }
                                  className="mt-1 h-8 text-xs"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!(
                    projectId !== "none" &&
                    (customFormQ.isLoading || customFields.length > 0)
                  ) && (
                    <>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          maxLength={500}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="b" className="text-xs">
                          Billable
                        </Label>
                        <Switch id="b" checked={billable} onCheckedChange={setBillable} />
                      </div>
                    </>
                  )}

                  <DialogFooter className="pt-2">
                    <Button
                      size="sm"
                      onClick={log}
                      disabled={logging || customFormQ.isLoading}
                      className="w-full sm:w-auto"
                    >
                      {logging && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {logging ? "Logging..." : "Log Time"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-32 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider">
                Day
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider">
                Entries
              </th>
              <th className="w-24 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                Hours
              </th>
              <th className="w-20 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                Status
              </th>
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
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            {Number(e.hours).toFixed(2)}h
                          </span>
                          {e.billable && (
                            <span className="rounded bg-success/15 px-1 py-0.5 text-[9px] text-success">
                              $
                            </span>
                          )}
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                              e.status === "approved"
                                ? "bg-success/15 text-success"
                                : e.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : e.status === "submitted"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {e.status}
                          </span>
                          <span className="truncate flex items-center flex-wrap gap-2">
                            <span>
                              {e.tasks ? (
                                <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                                  {e.tasks.code}
                                </span>
                              ) : null}{" "}
                              {e.notes ?? e.tasks?.title ?? "—"}
                            </span>
                            {e.custom_values && Object.keys(e.custom_values).length > 0 && (
                              <span className="inline-flex flex-wrap gap-1">
                                {Object.entries(
                                  e.custom_values as Record<string, string | number | boolean>,
                                ).map(([label, val]) => (
                                  <span
                                    key={label}
                                    className="rounded bg-sidebar-accent/60 px-1 py-0.5 text-[9px] text-muted-foreground"
                                  >
                                    {label}: {String(val)}
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            {e.status === "draft" && !teamView && (
                              <button
                                disabled={submittingIds.has(e.id)}
                                onClick={() => submitEntry(e.id)}
                                className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                                title="Submit for approval"
                              >
                                {submittingIds.has(e.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Submit"
                                )}
                              </button>
                            )}
                            {e.status === "submitted" && canViewTeam && (
                              <>
                                <button
                                  disabled={approvingIds.has(e.id)}
                                  onClick={() => approveEntry(e.id)}
                                  className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-success/10 text-success hover:bg-success/20 disabled:opacity-50"
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  disabled={approvingIds.has(e.id)}
                                  onClick={() => rejectEntry(e.id)}
                                  className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                  title="Reject"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            {e.status === "draft" && (
                              <button
                                onClick={() => openEditEntry(e)}
                                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                title="Edit entry"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              disabled={deletingIds.has(e.id)}
                              onClick={() => del(e.id)}
                              className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingIds.has(e.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {d.total.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${d.total === 0 ? "bg-muted text-muted-foreground" : d.total >= 8 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
                  >
                    {d.total === 0 ? "Empty" : d.total >= 8 ? "Full" : "Partial"}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-surface-2">
              <td colSpan={2} className="px-3 py-2 text-xs font-medium">
                Week total
              </td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums">
                {weekTotal.toFixed(1)}h
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit entry dialog */}
      <Dialog
        open={!!editEntry}
        onOpenChange={(v) => {
          if (!v) setEditEntry(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit time entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  min={0.25}
                  max={24}
                  step={0.25}
                  value={editHours}
                  onChange={(e) => setEditHours(Number(e.target.value))}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-b" className="text-xs">
                Billable
              </Label>
              <Switch id="edit-b" checked={editBillable} onCheckedChange={setEditBillable} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditEntry(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEditEntry} disabled={editSaving}>
              {editSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
