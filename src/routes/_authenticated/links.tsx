import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  createPersonalLink,
  deletePersonalLink,
  getPersonalLinks,
  updatePersonalLink,
  LinkCategory,
} from "@/server-fns/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FileText,
  Table,
  Presentation,
  FolderOpen,
  Image as ImageIcon,
  Video,
  File,
  Link2,
  MoreHorizontal,
  Loader2,
  Pin,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/links")({
  component: LinksPage,
});

const CATEGORIES: { value: LinkCategory; label: string; icon: React.ElementType }[] = [
  { value: "doc", label: "Documents", icon: FileText },
  { value: "sheet", label: "Spreadsheets", icon: Table },
  { value: "excel", label: "Excel", icon: Table },
  { value: "slide", label: "Slides", icon: Presentation },
  { value: "folder", label: "Folders", icon: FolderOpen },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "file", label: "Files", icon: File },
  { value: "link", label: "Links", icon: Link2 },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

function LinksPage() {
  const qc = useQueryClient();
  const { activeOrgId } = useWorkspace();
  const searchParams = Route.useSearch<{ new?: string }>();
  const [open, setOpen] = useState(searchParams.new === "1");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<LinkCategory>("link");
  const [description, setDescription] = useState("");
  const [pinned, setPinned] = useState(false);
  const [filter, setFilter] = useState<LinkCategory | "all">("all");
  const [creating, setCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const linksQ = useQuery({
    queryKey: ["personal-links", activeOrgId],
    queryFn: () => getPersonalLinks({ data: { organizationId: activeOrgId! } }),
    enabled: !!activeOrgId,
  });

  if (!activeOrgId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const links = (linksQ.data ?? []).filter((link) =>
    filter === "all" ? true : link.category === filter,
  );

  async function create() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!url.trim() || !url.startsWith("http")) {
      toast.error("Valid URL is required (must start with http/https)");
      return;
    }
    setCreating(true);
    try {
      await createPersonalLink({
        data: {
          organizationId: activeOrgId!,
          name: name.trim(),
          url: url.trim(),
          description: description.trim() || null,
          category,
          pinned,
        },
      });
      toast.success("Link added");
      setName("");
      setUrl("");
      setDescription("");
      setCategory("link");
      setPinned(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["personal-links", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add link");
    } finally {
      setCreating(false);
    }
  }

  async function update(
    id: string,
    patch: Parameters<typeof updatePersonalLink>[0]["data"]["patch"],
  ) {
    setUpdatingIds((current) => new Set(current).add(id));
    try {
      await updatePersonalLink({ data: { id, patch } });
      qc.invalidateQueries({ queryKey: ["personal-links", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update link");
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this link?")) return;
    setDeletingIds((current) => new Set(current).add(id));
    try {
      await deletePersonalLink({ data: id });
      qc.invalidateQueries({ queryKey: ["personal-links", activeOrgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete link");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Links & Docs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bookmark your important documents, spreadsheets, and links in your personal workspace.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> New link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q3 Roadmap Draft"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as LinkCategory)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4 text-muted-foreground" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex h-10 items-center gap-2 text-sm font-medium">
                  <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(Boolean(c))} />
                  Pin to top
                </label>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {creating ? "Adding..." : "Add Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {links.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center"
        >
          <div className="rounded-full bg-surface p-4 shadow-sm ring-1 ring-border">
            <Link2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No links found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "all"
              ? "Add important links, docs, and folders to access them quickly."
              : `You haven't added any ${CATEGORIES.find((c) => c.value === filter)?.label.toLowerCase()} yet.`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => {
              if (filter !== "all") setCategory(filter);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Link
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {links.map((link, i) => {
              const updating = updatingIds.has(link.id);
              const deleting = deletingIds.has(link.id);
              const Icon = CATEGORIES.find((c) => c.value === link.category)?.icon || Link2;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  key={link.id}
                  className="group relative flex flex-col rounded-xl border border-border bg-surface/60 p-4 shadow-sm backdrop-blur-xl transition-colors hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex -mr-2 -mt-2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        disabled={updating || deleting}
                        onClick={() => update(link.id, { pinned: !link.pinned })}
                        title={link.pinned ? "Unpin" : "Pin to top"}
                      >
                        {updating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Pin
                            className={`h-3.5 w-3.5 ${link.pinned ? "fill-primary text-primary" : ""}`}
                          />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={updating || deleting}
                        onClick={() => remove(link.id)}
                        title="Delete"
                      >
                        {deleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="line-clamp-1 font-medium leading-tight tracking-tight">
                        {link.name}
                      </h3>
                      {link.pinned && (
                        <Pin className="h-3 w-3 shrink-0 fill-primary text-primary md:hidden" />
                      )}
                    </div>
                    {link.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(link.updated_at), { addSuffix: true })}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
