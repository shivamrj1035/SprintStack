import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserSearchInput, type SelectedUser } from "./UserSearchInput";
import { getOrCreateDirectConversation, createGroupConversation } from "@/server-fns/chat";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string | null;
  isPersonalWorkspace: boolean;
  currentUserId?: string;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  organizationId,
  isPersonalWorkspace,
  currentUserId,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [selected, setSelected] = useState<SelectedUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one person");
      return;
    }

    setLoading(true);
    try {
      if (tab === "dm") {
        const { conversationId } = await getOrCreateDirectConversation({
          data: { otherUserId: selected[0].id },
        });
        onOpenChange(false);
        navigate({ to: "/chat/$conversationId", params: { conversationId } });
      } else {
        if (!groupName.trim()) {
          toast.error("Enter a group name");
          setLoading(false);
          return;
        }
        const { conversationId } = await createGroupConversation({
          data: {
            name: groupName.trim(),
            memberIds: selected.map((u) => u.id),
            organizationId: organizationId ?? null,
          },
        });
        onOpenChange(false);
        navigate({ to: "/chat/$conversationId", params: { conversationId } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start conversation");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelected([]);
    setGroupName("");
    setTab("dm");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as "dm" | "group");
            setSelected([]);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="dm" className="flex-1">
              Direct message
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              Group chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dm" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Person</Label>
              <UserSearchInput
                organizationId={organizationId}
                isPersonalWorkspace={isPersonalWorkspace}
                currentUserId={currentUserId}
                selected={selected}
                onSelect={(u) => setSelected([u])}
                onRemove={() => setSelected([])}
                placeholder="Search by name or email…"
              />
            </div>
          </TabsContent>

          <TabsContent value="group" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Group name</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Frontend team"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Members</Label>
              <UserSearchInput
                organizationId={organizationId}
                isPersonalWorkspace={isPersonalWorkspace}
                currentUserId={currentUserId}
                selected={selected}
                onSelect={(u) => setSelected((prev) => [...prev, u])}
                onRemove={(id) => setSelected((prev) => prev.filter((u) => u.id !== id))}
                placeholder="Add people…"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || selected.length === 0}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tab === "dm" ? "Open chat" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
