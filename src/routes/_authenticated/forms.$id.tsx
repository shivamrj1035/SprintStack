import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFormTemplateById, saveFormTemplate } from "@/server-fns/functions";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Info,
  Layers,
  Sparkles,
  Check,
  Calendar,
  User,
  Clock,
  ChevronDown,
  Settings,
  HelpCircle,
  Eye,
  Sliders,
  History,
  AlertTriangle,
  Mail,
  Phone,
  Signature,
  FileText,
  Camera,
  MapPin,
  Heading,
  CheckSquare,
  Loader2,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/forms/$id")({
  component: FormBuilderPage,
});

interface FormField {
  id: string;
  type: string;
  label: string;
  category: "input" | "selection" | "content" | "layout";
  required: boolean;
  placeholder?: string;
  options?: string[];
  width?: string;
}

// PALETTE ITEMS CONFIGURATION
const PALETTE_INPUT = [
  { type: "text", label: "Text", icon: FileText },
  { type: "number", label: "Number", icon: FileText },
  { type: "auto_number", label: "Auto Number", icon: FileText },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "date", label: "Date", icon: Calendar },
  { type: "time", label: "Time", icon: Clock },
  { type: "datetime", label: "Date & Time", icon: Calendar },
  { type: "signature", label: "Signature", icon: Signature },
  { type: "pi_tag", label: "PI Tag", icon: Settings },
];

const PALETTE_SELECTION = [
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "radio", label: "Radio", icon: ChevronDown },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
];

const PALETTE_CONTENT = [
  { type: "textarea", label: "Textarea", icon: FileText },
  { type: "file", label: "File", icon: FileText },
  { type: "photo_capture", label: "Photo Capture", icon: Camera },
  { type: "geolocation", label: "Geo Location", icon: MapPin },
  { type: "table", label: "Table", icon: Sliders },
  { type: "content_block", label: "Content Block", icon: Info },
];

const PALETTE_LAYOUT = [{ type: "section_header", label: "Section Header", icon: Heading }];

function FormBuilderPage() {
  const { id: templateId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { activeOrgId, activeOrg } = useWorkspace();
  const primaryOrganization = activeOrg;

  // Load Template Query
  const templateQ = useQuery({
    queryKey: ["form-template-detail", templateId],
    queryFn: () => getFormTemplateById({ data: { template_id: templateId } }),
    enabled: !!templateId,
  });

  const dbTemplate = templateQ.data as any;

  // Client side edit states
  const [fields, setFields] = useState<FormField[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [version, setVersion] = useState("v1");

  // Layout states
  const [pageSize, setPageSize] = useState<string>("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margins, setMargins] = useState({ top: 20, right: 20, bottom: 20, left: 20 });
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(true);
  const [footerCells, setFooterCells] = useState([
    {
      id: "1",
      type: "prepared",
      label: "Prepared by",
      name: "Prepared by - Name",
      date: "Prepared by - Date",
    },
    {
      id: "2",
      type: "submitted",
      label: "Submitted by",
      name: "Submitted by - Name",
      date: "Submitted by - Date",
    },
    {
      id: "3",
      type: "approved",
      label: "Approved by",
      name: "Approved by - Name",
      date: "Approved by - Date",
    },
  ]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("fields");
  const [searchFieldQuery, setSearchFieldQuery] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Tracks which template was loaded into the editor state
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);

  // Sync loaded DB data into local state (runs only once per templateId)
  useEffect(() => {
    if (dbTemplate && loadedTemplateId !== templateId) {
      setFields((dbTemplate.fields as unknown as FormField[]) || []);
      setName(dbTemplate.name);
      setDescription(dbTemplate.description || "");
      setStatus(dbTemplate.status);
      setVersion(dbTemplate.version);

      const ls = dbTemplate.layout_settings as Record<string, unknown> | null;
      if (ls) {
        if (ls.pageSize) setPageSize(ls.pageSize as string);
        if (ls.orientation) setOrientation(ls.orientation as "portrait" | "landscape");
        if (ls.margins)
          setMargins(ls.margins as { top: number; right: number; bottom: number; left: number });
        if (ls.headerEnabled !== undefined) setHeaderEnabled(ls.headerEnabled as boolean);
        if (ls.footerEnabled !== undefined) setFooterEnabled(ls.footerEnabled as boolean);
        if (ls.footerCells) setFooterCells(ls.footerCells as typeof footerCells);
      }
      setLoadedTemplateId(templateId);
    }
  }, [dbTemplate, templateId, loadedTemplateId]);

  // Check if there are unsaved client edits compared to DB values
  const hasUnsavedChanges = useMemo(() => {
    if (!dbTemplate) return false;
    const dbFieldsStr = JSON.stringify(dbTemplate.fields);
    const clientFieldsStr = JSON.stringify(fields);

    const dbLayoutStr = JSON.stringify(dbTemplate.layout_settings);
    const clientLayoutStr = JSON.stringify({
      pageSize,
      orientation,
      margins,
      headerEnabled,
      footerEnabled,
      footerCells,
    });

    return (
      dbFieldsStr !== clientFieldsStr ||
      dbLayoutStr !== clientLayoutStr ||
      dbTemplate.name !== name ||
      (dbTemplate.description || "") !== description ||
      dbTemplate.status !== status
    );
  }, [
    dbTemplate,
    fields,
    name,
    description,
    status,
    pageSize,
    orientation,
    margins,
    headerEnabled,
    footerEnabled,
    footerCells,
  ]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: { status: "draft" | "published" | "archived"; versionBump?: boolean }) => {
      let finalVersion = version;
      if (data.versionBump) {
        const currentVerNum = parseInt(version.replace("v", ""), 10) || 1;
        finalVersion = `v${currentVerNum + 1}`;
      }

      return saveFormTemplate({
        data: {
          id: templateId,
          organization_id: primaryOrganization?.id ?? "",
          project_id: dbTemplate?.project_id || null,
          name,
          description: description || null,
          status: data.status,
          fields: fields.map((f) => ({
            id: f.id,
            type: f.type,
            label: f.label,
            category: f.category,
            options: f.options,
            required: f.required,
            placeholder: f.placeholder,
            width: f.width || "100",
          })),
          layout_settings: {
            pageSize,
            orientation,
            margins,
            headerEnabled,
            footerEnabled,
            footerCells,
          },
          version: finalVersion,
        },
      });
    },
    onSuccess: (updated) => {
      setLoadedTemplateId(null); // Allow next query refetch/update to sync to local state
      qc.invalidateQueries({ queryKey: ["form-template-detail", templateId] });
      qc.invalidateQueries({ queryKey: ["form-templates", primaryOrganization?.id] });
      const res = updated as { version: string; status: "draft" | "published" | "archived" } | null;
      if (res) {
        setVersion(res.version);
        setStatus(res.status);
      }
      toast.success("Changes saved successfully!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    },
  });

  // Revert changes
  const handleRevert = () => {
    if (dbTemplate) {
      setFields((dbTemplate.fields as unknown as FormField[]) || []);
      setName(dbTemplate.name);
      setDescription(dbTemplate.description || "");
      setStatus(dbTemplate.status);

      const ls = dbTemplate.layout_settings as Record<string, unknown> | null;
      if (ls) {
        if (ls.pageSize) setPageSize(ls.pageSize as string);
        if (ls.orientation) setOrientation(ls.orientation as "portrait" | "landscape");
        if (ls.margins)
          setMargins(ls.margins as { top: number; right: number; bottom: number; left: number });
        if (ls.headerEnabled !== undefined) setHeaderEnabled(ls.headerEnabled as boolean);
        if (ls.footerEnabled !== undefined) setFooterEnabled(ls.footerEnabled as boolean);
        if (ls.footerCells) setFooterCells(ls.footerCells as typeof footerCells);
      }
      setSelectedFieldId(null);
      setSelectedCellId(null);
      toast.success("Changes discarded");
    }
  };

  // Add Field handler
  const handleAddField = (
    paletteItem: { type: string; label: string; icon: React.ComponentType<{ className?: string }> },
    category: FormField["category"],
  ) => {
    const newFieldId = `${paletteItem.type}_${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormField = {
      id: newFieldId,
      type: paletteItem.type,
      label: paletteItem.label,
      category,
      required: false,
      placeholder: `Enter ${paletteItem.label.toLowerCase()}`,
      options: ["Dropdown", "Radio"].includes(paletteItem.type)
        ? ["Option 1", "Option 2", "Option 3"]
        : undefined,
      width: "100",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newFieldId);
    toast.success(`Added ${paletteItem.label} field`);
  };

  // Field Config updates
  const handleUpdateField = (
    fieldId: string,
    key: keyof FormField | "width",
    value: string | boolean | string[] | undefined,
  ) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)));
  };

  const handleRemoveField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    toast.success("Field removed from canvas");
  };

  // Reorder fields
  const handleMoveField = (fieldId: string, direction: "up" | "down") => {
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    const nextFields = [...fields];
    if (direction === "up" && idx > 0) {
      nextFields[idx] = nextFields[idx - 1];
      nextFields[idx - 1] = fields[idx];
    } else if (direction === "down" && idx < fields.length - 1) {
      nextFields[idx] = nextFields[idx + 1];
      nextFields[idx + 1] = fields[idx];
    }
    setFields(nextFields);
  };

  // Filter palette items based on search input
  const filteredPalette = (palette: typeof PALETTE_INPUT) => {
    return palette.filter((item) =>
      item.label.toLowerCase().includes(searchFieldQuery.toLowerCase()),
    );
  };

  // Active Field details in Right panel
  const activeField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  const activeCell = useMemo(() => {
    return footerCells.find((c) => c.id === selectedCellId) || null;
  }, [footerCells, selectedCellId]);

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden text-foreground bg-background">
      {/* LEFT CANVAS & EDITOR */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-w-0 bg-background border-r border-border"
      >
        {/* Header Breadcrumbs */}
        <header className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0 bg-sidebar/35">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              asChild
              className="h-7 w-7 text-muted-foreground hover:text-foreground mr-1"
            >
              <Link to="/forms">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Form Templates</span>
            <span className="text-xs text-muted-foreground/50">/</span>
            <span className="text-xs font-semibold text-foreground truncate">{name}</span>

            <Badge
              className={`text-[9px] font-mono border-none uppercase py-0.5 px-2 shrink-0 ${
                status === "published"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : status === "archived"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {status}
            </Badge>
            <span className="text-[9px] font-mono text-muted-foreground bg-surface border border-border/80 rounded px-1 shrink-0">
              {version}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border/70">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> Auto-saved to drafts
            </span>
          </div>
        </header>

        {/* Tab Controls */}
        <div className="px-4 py-2 border-b border-border flex justify-between items-center bg-sidebar/20 shrink-0">
          <TabsList className="bg-surface h-8 p-0.5">
            <TabsTrigger value="fields" className="text-xs px-3 h-7 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> Fields
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs px-3 h-7 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Layout
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs px-3 h-7 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Versions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* FIELDS BUILDER CANVAS */}
        <TabsContent value="fields" className="flex-1 min-h-0 focus-visible:outline-none">
          <ScrollArea className="h-full p-4">
            <div className="max-w-xl mx-auto space-y-4 pt-2">
              <div className="space-y-1 bg-surface-2/20 border border-border rounded-lg p-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Template Metadata
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template Name"
                  className="h-8 text-xs font-semibold mt-1"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="text-xs resize-none mt-2"
                />
              </div>

              {fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/80 bg-surface-2/10 rounded-lg text-center min-h-[300px]">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <h4 className="text-xs font-semibold text-foreground">No fields yet</h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-normal">
                    Click a field type from the palette on the right, or drag one onto this canvas
                    to start building your form.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fields.map((field, idx) => {
                    const isSelected = selectedFieldId === field.id;
                    const widthClass =
                      {
                        "100": "w-full",
                        "50": "w-[calc(50%-4px)]",
                        "33": "w-[calc(33.33%-6px)]",
                        "25": "w-[calc(25%-6px)]",
                      }[field.width || "100"] || "w-full";
                    return (
                      <div
                        key={field.id}
                        onClick={() => {
                          setSelectedFieldId(field.id);
                          setSelectedCellId(null);
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between shrink-0 ${widthClass} ${
                          isSelected
                            ? "bg-surface border-primary shadow-sm"
                            : "bg-surface border-border hover:bg-surface-2/30"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-border shrink-0">
                            {field.type}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-400 font-bold shrink-0">*</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(field.id, "up");
                            }}
                            className="h-5 w-5 rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === fields.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(field.id, "down");
                            }}
                            className="h-5 w-5 rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center justify-center"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveField(field.id);
                            }}
                            className="h-5 w-5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* LAYOUT PREVIEW VIEW */}
        <TabsContent value="layout" className="flex-1 min-h-0 focus-visible:outline-none">
          <ScrollArea className="h-full p-4 bg-muted/20">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Page settings and Header/Footer controls */}
              <Card className="bg-surface border-border">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="h-4 w-4 text-primary" /> Page & Sheet Layout Settings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Page Size */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Page Size</Label>
                      <Select value={pageSize} onValueChange={setPageSize}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="A4" className="text-xs">
                            A4 (210 × 297 mm)
                          </SelectItem>
                          <SelectItem value="Letter" className="text-xs">
                            Letter (8.5 × 11 in)
                          </SelectItem>
                          <SelectItem value="A3" className="text-xs">
                            A3 (297 × 420 mm)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Orientation</Label>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={orientation === "portrait" ? "default" : "outline"}
                          onClick={() => setOrientation("portrait")}
                          className="h-8 text-xs flex-1 font-medium"
                        >
                          Portrait
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={orientation === "landscape" ? "default" : "outline"}
                          onClick={() => setOrientation("landscape")}
                          className="h-8 text-xs flex-1 font-medium"
                        >
                          Landscape
                        </Button>
                      </div>
                    </div>

                    {/* Margins */}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Page Margins (mm)</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["top", "right", "bottom", "left"] as const).map((m) => (
                          <div key={m} className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block text-center capitalize">
                              {m}
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={margins[m]}
                              onChange={(e) =>
                                setMargins((prev) => ({
                                  ...prev,
                                  [m]: Math.max(0, parseInt(e.target.value) || 0),
                                }))
                              }
                              className="h-7 text-xs text-center bg-background focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="header-toggle"
                          checked={headerEnabled}
                          onCheckedChange={setHeaderEnabled}
                        />
                        <Label
                          htmlFor="header-toggle"
                          className="text-xs font-semibold cursor-pointer"
                        >
                          Enable Header Block
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="footer-toggle"
                          checked={footerEnabled}
                          onCheckedChange={setFooterEnabled}
                        />
                        <Label
                          htmlFor="footer-toggle"
                          className="text-xs font-semibold cursor-pointer"
                        >
                          Enable Approval Footer Table
                        </Label>
                      </div>
                    </div>

                    <span className="text-[10px] text-muted-foreground italic">
                      💡 Click on approval cells in the footer table to customize labels in the
                      right panel.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Form Page Sheet Preview */}
              <div className="flex justify-center py-4">
                <div
                  className={`w-full bg-white text-slate-800 border border-slate-300 rounded shadow-2xl transition-all duration-300 overflow-hidden relative ${
                    orientation === "portrait"
                      ? "max-w-[210mm] min-h-[297mm]"
                      : "max-w-[297mm] min-h-[210mm]"
                  }`}
                  style={{
                    paddingTop: `${margins.top}px`,
                    paddingRight: `${margins.right}px`,
                    paddingBottom: `${margins.bottom + (footerEnabled ? 100 : 20)}px`,
                    paddingLeft: `${margins.left}px`,
                  }}
                >
                  {/* HEADER BLOCK */}
                  {headerEnabled && (
                    <div className="border-b border-slate-400 pb-3 mb-5 flex justify-between items-start text-xs font-sans">
                      <div>
                        <div className="text-[10px] font-bold text-primary tracking-wide uppercase font-mono">
                          SprintStack Form Record
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-1 uppercase tracking-tight">
                          {name || "Untitled Form"}
                        </h2>
                        {description && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-md leading-relaxed">
                            {description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-slate-500 space-y-0.5 font-mono">
                        <div>
                          PROJECT:{" "}
                          <span className="font-semibold text-slate-800">
                            {dbTemplate?.project_name || "None"}
                          </span>
                        </div>
                        <div>
                          VERSION: <span className="font-semibold text-slate-800">{version}</span>
                        </div>
                        <div>
                          STATUS:{" "}
                          <span className="font-semibold text-slate-800 uppercase">{status}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NO HEADER - SIMPLE TITLE */}
                  {!headerEnabled && (
                    <div className="border-b border-slate-200 pb-2 mb-4 text-left font-sans">
                      <h2 className="text-sm font-bold text-slate-900 uppercase">
                        {name || "Untitled Form"}
                      </h2>
                      {description && (
                        <p className="text-[9px] text-slate-500 mt-0.5">{description}</p>
                      )}
                    </div>
                  )}

                  {/* FORM FIELDS GRID PREVIEW */}
                  <div className="flex flex-wrap gap-x-4 gap-y-3 font-sans pb-10">
                    {fields.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded w-full bg-slate-50/50">
                        No form fields defined. Go back to the "Fields" tab to add inputs.
                      </div>
                    ) : (
                      fields.map((field) => {
                        const widthClass =
                          {
                            "100": "w-full",
                            "50": "w-[calc(50%-8px)]",
                            "33": "w-[calc(33.33%-11px)]",
                            "25": "w-[calc(25%-12px)]",
                          }[field.width || "100"] || "w-full";
                        return (
                          <div
                            key={field.id}
                            className={`space-y-1 shrink-0 text-left ${widthClass}`}
                          >
                            <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === "section_header" ? (
                              <div className="border-b border-slate-300 pb-1.5 mt-2">
                                <h4 className="text-xs font-bold text-primary tracking-wide uppercase font-sans">
                                  {field.label}
                                </h4>
                              </div>
                            ) : field.type === "textarea" || field.type === "content_block" ? (
                              <textarea
                                placeholder={field.placeholder || "Enter description details..."}
                                className="text-xs resize-none h-16 w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 cursor-not-allowed text-slate-500 focus:outline-none"
                                disabled
                              />
                            ) : field.type === "dropdown" ? (
                              <select
                                disabled
                                className="h-8 text-xs w-full rounded border border-slate-300 bg-slate-50 px-2 cursor-not-allowed text-slate-500 focus:outline-none"
                              >
                                <option>{field.placeholder || "Select option..."}</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === "radio" ? (
                              <div className="flex gap-4 pt-1">
                                {(field.options || []).map((opt) => (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 cursor-not-allowed"
                                  >
                                    <input
                                      type="radio"
                                      disabled
                                      className="h-3.5 w-3.5 border-slate-300"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : field.type === "checkbox" ? (
                              <div className="flex items-center gap-2 pt-1.5 text-xs text-slate-500 cursor-not-allowed">
                                <input
                                  type="checkbox"
                                  disabled
                                  className="rounded border-slate-300"
                                />
                                <span>Accept validation</span>
                              </div>
                            ) : field.type === "photo_capture" ? (
                              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 bg-slate-50 rounded cursor-not-allowed">
                                <Camera className="h-4 w-4 text-slate-400 mb-1" />
                                <span className="text-[9px] text-slate-400">
                                  Photo Capture Input
                                </span>
                              </div>
                            ) : field.type === "geolocation" ? (
                              <div className="flex items-center gap-2 p-2 rounded border border-slate-200 bg-slate-50">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-mono text-slate-400">
                                  Latitude: 0.00, Longitude: 0.00
                                </span>
                              </div>
                            ) : (
                              <input
                                placeholder={
                                  field.placeholder || `Enter ${field.label.toLowerCase()}...`
                                }
                                className="h-8 text-xs w-full rounded border border-slate-300 bg-slate-50 px-2 cursor-not-allowed text-slate-500 focus:outline-none"
                                disabled
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* FOOTER BLOCK TABLE */}
                  {footerEnabled && (
                    <div className="absolute bottom-6 left-0 right-0 px-6 font-sans">
                      <div className="grid grid-cols-3 border border-slate-300 divide-x divide-slate-300 bg-slate-50/50">
                        {footerCells.map((cell) => {
                          const isSelected = selectedCellId === cell.id;
                          return (
                            <div
                              key={cell.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCellId(cell.id);
                                setSelectedFieldId(null);
                              }}
                              className={`p-2.5 text-center cursor-pointer transition-all hover:bg-slate-100/50 space-y-1.5 ${
                                isSelected ? "ring-2 ring-primary ring-offset-1 bg-primary/5" : ""
                              }`}
                            >
                              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                {cell.label}
                              </div>
                              <div className="h-6 border-b border-dashed border-slate-300 mx-4 flex items-end justify-center">
                                <span className="text-[9px] text-slate-400 italic">
                                  {cell.name}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 italic font-mono pt-1">
                                {cell.date}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* HISTORICAL VERSION LOG PREVIEW */}
        <TabsContent value="versions" className="flex-1 min-h-0 focus-visible:outline-none">
          <ScrollArea className="h-full p-4">
            <div className="max-w-xl mx-auto space-y-3 pt-2">
              {[
                {
                  ver: "v2",
                  date: "Today, 17:03",
                  author: "Sarah Jenkins",
                  changes: "Added photo capture and dropdown selection elements",
                },
                {
                  ver: "v1",
                  date: "Yesterday, 14:20",
                  author: "Marcus Vance",
                  changes: "Initial template workspace initialization",
                },
              ].map((v) => (
                <div key={v.ver} className="p-3 border border-border rounded bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono">{v.ver}</span>
                      {version === v.ver && (
                        <Badge className="bg-primary/10 border-none text-primary text-[8px]">
                          Active Tag
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.date}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">{v.changes}</p>
                  <div className="border-t border-border/40 pt-2 flex justify-between items-center text-[9px] text-muted-foreground">
                    <span>Created by: {v.author}</span>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Swapped to configuration version ${v.ver}`);
                      }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Rollback to {v.ver}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* BOTTOM ACTION BAR */}
        <footer className="h-12 border-t border-border px-4 flex items-center justify-between shrink-0 bg-sidebar/20">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Unsaved changes in template builder
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> All edits saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRevert}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveMutation.mutate({ status: "draft" })}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className="text-xs h-8"
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate({ status: "published", versionBump: true })}
              disabled={saveMutation.isPending}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Publish (New Version)
            </Button>
          </div>
        </footer>
      </Tabs>

      {/* RIGHT PALETTE SIDEBAR */}
      <aside className="w-80 border-l border-border bg-sidebar flex flex-col shrink-0">
        {/* If a cell is selected, show cell settings, else if a field is selected, show field settings, else show Palette */}
        {activeCell ? (
          <div className="flex flex-col h-full">
            <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <Settings className="h-4 w-4" /> Grid Cell settings
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedCellId(null)}
                className="h-6 w-6 text-muted-foreground"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-foreground">
                  Configure Approval Grid Cell:
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cell-label" className="text-[11px] text-muted-foreground">
                    Cell Header Label
                  </Label>
                  <Input
                    id="cell-label"
                    value={activeCell.label}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setFooterCells((prev) =>
                        prev.map((c) => (c.id === activeCell.id ? { ...c, label: newVal } : c)),
                      );
                    }}
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cell-name" className="text-[11px] text-muted-foreground">
                    Signee Name Placeholder
                  </Label>
                  <Input
                    id="cell-name"
                    value={activeCell.name}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setFooterCells((prev) =>
                        prev.map((c) => (c.id === activeCell.id ? { ...c, name: newVal } : c)),
                      );
                    }}
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cell-date" className="text-[11px] text-muted-foreground">
                    Signature Date Placeholder
                  </Label>
                  <Input
                    id="cell-date"
                    value={activeCell.date}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setFooterCells((prev) =>
                        prev.map((c) => (c.id === activeCell.id ? { ...c, date: newVal } : c)),
                      );
                    }}
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : activeField ? (
          <div className="flex flex-col h-full">
            <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <Settings className="h-4 w-4" /> Field Attributes
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedFieldId(null)}
                className="h-6 w-6 text-muted-foreground"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-border">
                    {activeField.type}
                  </span>
                  <div className="text-xs font-semibold text-foreground mt-2">
                    Configuring Field: {activeField.label}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="field-label" className="text-[11px] text-muted-foreground">
                    Field Label
                  </Label>
                  <Input
                    id="field-label"
                    value={activeField.label}
                    onChange={(e) => handleUpdateField(activeField.id, "label", e.target.value)}
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                {activeField.type !== "section_header" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="field-width" className="text-[11px] text-muted-foreground">
                      Field Width (Grid Layout)
                    </Label>
                    <Select
                      value={activeField.width || "100"}
                      onValueChange={(val) => handleUpdateField(activeField.id, "width", val)}
                    >
                      <SelectTrigger
                        id="field-width"
                        className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary bg-background"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="100" className="text-xs">
                          Full Width (100%)
                        </SelectItem>
                        <SelectItem value="50" className="text-xs">
                          Half Width (50%)
                        </SelectItem>
                        <SelectItem value="33" className="text-xs">
                          One-Third (33%)
                        </SelectItem>
                        <SelectItem value="25" className="text-xs">
                          One-Quarter (25%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="field-placeholder" className="text-[11px] text-muted-foreground">
                    Placeholder Sub-Text
                  </Label>
                  <Input
                    id="field-placeholder"
                    value={activeField.placeholder || ""}
                    onChange={(e) =>
                      handleUpdateField(activeField.id, "placeholder", e.target.value)
                    }
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                {/* Comma-split options editing for select drop-downs or radios */}
                {["dropdown", "radio"].includes(activeField.type) && (
                  <div className="space-y-1.5">
                    <Label htmlFor="field-options" className="text-[11px] text-muted-foreground">
                      Dropdown Options (comma split)
                    </Label>
                    <Textarea
                      id="field-options"
                      value={(activeField.options || []).join(", ")}
                      onChange={(e) => {
                        const opts = e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean);
                        handleUpdateField(activeField.id, "options", opts);
                      }}
                      rows={3}
                      className="text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Required Input</Label>
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Mandate user response on task creation
                    </p>
                  </div>
                  <Switch
                    checked={activeField.required}
                    onCheckedChange={(checked) =>
                      handleUpdateField(activeField.id, "required", checked)
                    }
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border shrink-0 bg-surface-2/10">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveField(activeField.id)}
                className="w-full text-xs h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Field
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-3.5 border-b border-border space-y-2 shrink-0">
              <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Fields
              </span>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchFieldQuery}
                  onChange={(e) => setSearchFieldQuery(e.target.value)}
                  placeholder="Search fields..."
                  className="h-8 pl-7 text-xs bg-surface-2/40 border-border/60"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-4">
                {/* INPUT CATEGORY */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    Input
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredPalette(PALETTE_INPUT).map((item) => (
                      <Button
                        key={item.type}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddField(item, "input")}
                        className="h-8 justify-start text-[11px] px-2 gap-1.5 border-border/80 hover:border-primary/50 text-foreground transition"
                      >
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* SELECTION CATEGORY */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    Selection
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredPalette(PALETTE_SELECTION).map((item) => (
                      <Button
                        key={item.type}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddField(item, "selection")}
                        className="h-8 justify-start text-[11px] px-2 gap-1.5 border-border/80 hover:border-primary/50 text-foreground transition"
                      >
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* CONTENT CATEGORY */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    Content
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredPalette(PALETTE_CONTENT).map((item) => (
                      <Button
                        key={item.type}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddField(item, "content")}
                        className="h-8 justify-start text-[11px] px-2 gap-1.5 border-border/80 hover:border-primary/50 text-foreground transition"
                      >
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* LAYOUT CATEGORY */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    Layout
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredPalette(PALETTE_LAYOUT).map((item) => (
                      <Button
                        key={item.type}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddField(item, "layout")}
                        className="h-8 justify-start text-[11px] px-2 gap-1.5 border-border/80 hover:border-primary/50 text-foreground transition"
                      >
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </aside>
    </div>
  );
}

// Simple fallback X icon component
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
