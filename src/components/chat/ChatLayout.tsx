import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConversations } from "@/hooks/use-conversations";
import { ConversationList } from "./ConversationList";
import { NewConversationDialog } from "./NewConversationDialog";
import { ChatContext } from "./ChatContext";
import { getProfilesByIds } from "@/server-fns/chat";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";

interface Props {
  children: ReactNode;
}

export function ChatLayout({ children }: Props) {
  const { session, profile } = useAuth();
  const { activeOrg } = useWorkspace();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const isPersonalWorkspace = activeOrg?.kind === "personal";
  const orgFilterId = isPersonalWorkspace ? null : (activeOrg?.id ?? null);

  const { conversations, loading } = useConversations(session?.id ?? null, orgFilterId);

  const allParticipantIds = [
    ...new Set(conversations.flatMap((c) => c.participants).filter((id) => id !== session?.id)),
  ];

  const profilesQ = useQuery({
    queryKey: ["chat-participant-profiles", allParticipantIds.sort().join(",")],
    queryFn: () =>
      allParticipantIds.length > 0
        ? getProfilesByIds({ data: { userIds: allParticipantIds } })
        : Promise.resolve([]),
    enabled: allParticipantIds.length > 0,
  });

  const participantProfiles: Record<string, { name: string; avatarUrl: string | null }> = {};
  for (const p of profilesQ.data ?? []) {
    participantProfiles[p.id] = { name: p.name ?? p.id, avatarUrl: p.avatarUrl ?? null };
  }

  const ctx = {
    conversations,
    conversationsLoading: loading,
    participantProfiles,
    currentUserId: session?.id ?? "",
    currentUserName: profile?.name ?? "You",
    currentUserAvatar: profile?.avatar_url ?? null,
  };

  return (
    <ChatContext.Provider value={ctx}>
      <div className="h-full w-full flex overflow-hidden">
        <div className="w-72 lg:w-80 xl:w-96 shrink-0 border-r border-border bg-sidebar/50 flex flex-col h-full">
          <ConversationList
            conversations={conversations}
            loading={loading}
            currentUserId={session?.id ?? ""}
            participantProfiles={participantProfiles}
            onNewChat={() => setNewChatOpen(true)}
          />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">{children}</div>

        <NewConversationDialog
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          organizationId={orgFilterId}
          isPersonalWorkspace={isPersonalWorkspace}
          currentUserId={session?.id ?? ""}
        />
      </div>
    </ChatContext.Provider>
  );
}
