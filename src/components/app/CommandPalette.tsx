import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Timer,
  Plus,
  LogOut,
  StickyNote,
  Link2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/tasks")}>
            <ListChecks className="mr-2 h-4 w-4" /> Tasks
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" /> Projects
          </CommandItem>
          <CommandItem onSelect={() => go("/timesheets")}>
            <Timer className="mr-2 h-4 w-4" /> Timesheets
          </CommandItem>
          <CommandItem onSelect={() => go("/todos")}>
            <StickyNote className="mr-2 h-4 w-4" /> To-dos
          </CommandItem>
          <CommandItem onSelect={() => go("/links")}>
            <Link2 className="mr-2 h-4 w-4" /> Links & Docs
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/tasks?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> New task
          </CommandItem>
          <CommandItem onSelect={() => go("/projects?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> New project
          </CommandItem>
          <CommandItem onSelect={() => go("/timesheets?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> Log time
          </CommandItem>
          <CommandItem onSelect={() => go("/links?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> New link
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem
            onSelect={async () => {
              onOpenChange(false);
              await signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
