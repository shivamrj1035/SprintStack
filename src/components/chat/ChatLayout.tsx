import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConversations } from "@/hooks/use-conversations";
import { ConversationList } from "./ConversationList";
import { NewConversationDialog } from "./NewConversationDialog";
import { ChatContext } from "./ChatContext";
import { getProfilesByIds } from "@/server-fns/chat";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useStealth } from "@/hooks/use-stealth";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

export function ChatLayout({ children }: Props) {
  const { session, profile } = useAuth();
  const { isStealth } = useStealth();
  const { activeOrg } = useWorkspace();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const path = useRouterState().location.pathname;
  const navigate = useNavigate();

  // Detect if a conversation is actively selected (path = /chat/$id)
  const hasActiveConversation = path.startsWith("/chat/") && path !== "/chat/";

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
        {/* Conversation list panel
            Mobile: full-width, hidden when a conversation is active
            Desktop: fixed-width sidebar, always visible */}
        <div
          className={cn(
            "shrink-0 border-r flex flex-col h-full w-full md:w-72 lg:w-80 xl:w-96",
            hasActiveConversation ? "hidden md:flex" : "flex",
            isStealth ? "bg-[#151515] border-[#2d2d2d]" : "border-border bg-sidebar/50",
          )}
        >
          <ConversationList
            conversations={conversations}
            loading={loading}
            currentUserId={session?.id ?? ""}
            participantProfiles={participantProfiles}
            onNewChat={() => setNewChatOpen(true)}
          />
        </div>

        {/* Message thread panel
            Mobile: full-width, hidden when no conversation is active
            Desktop: flex-1, always visible */}
        <div
          className={`
            flex-1 flex flex-col h-full overflow-hidden min-w-0
            ${hasActiveConversation ? "flex" : "hidden md:flex"}
          `}
        >
          {/* Mobile back button — shown only when a conversation is active */}
          {hasActiveConversation && (
            <div className="md:hidden flex items-center gap-2 border-b border-border/60 px-3 h-11 bg-sidebar/50 shrink-0">
              <button
                onClick={() => navigate({ to: "/chat" })}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-target"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium">Chats</span>
              </button>
            </div>
          )}
          {children}
        </div>

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
