import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { firestoreDb } from "@/lib/firebase";
import { MessageThread } from "@/components/chat/MessageThread";
import { useChatContext } from "@/components/chat/ChatContext";
import type { Conversation } from "@/hooks/use-conversations";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  component: ConversationPage,
});

function ConversationContent() {
  const { conversationId } = Route.useParams();
  const {
    conversations,
    conversationsLoading,
    participantProfiles,
    currentUserId,
    currentUserName,
    currentUserAvatar,
  } = useChatContext();

  // Grace period: give the Firestore snapshot up to 3s to deliver a newly-created conversation
  // before falling back to a direct document fetch.
  const [graceExpired, setGraceExpired] = useState(false);
  // Direct-fetch fallback for when the conversation exists but isn't in the list query yet
  const [directConv, setDirectConv] = useState<Conversation | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    setGraceExpired(false);
    setDirectConv(null);
    const t = setTimeout(() => setGraceExpired(true), 3000);
    return () => clearTimeout(t);
  }, [conversationId]);

  // Once the grace period expires and the conversation still isn't in the list, fetch by ID
  useEffect(() => {
    if (!graceExpired) return;
    if (conversations.some((c) => c.id === conversationId)) return;

    let cancelled = false;
    setDirectLoading(true);

    getDoc(doc(firestoreDb, "conversations", conversationId))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const d = snap.data();
        setDirectConv({
          id: snap.id,
          type: d.type as "direct" | "group",
          organizationId: d.organizationId ?? null,
          participants: d.participants ?? [],
          name: d.name ?? null,
          lastMessage: d.lastMessage
            ? { ...d.lastMessage, timestamp: d.lastMessage.timestamp?.toDate?.() ?? new Date() }
            : null,
          unreadCounts: d.unreadCounts ?? {},
          createdAt: d.createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
          createdBy: d.createdBy ?? "",
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDirectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [graceExpired, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer the live-list version; fall back to the directly-fetched document
  const conversation = conversations.find((c) => c.id === conversationId) ?? directConv;

  if (!conversation && (conversationsLoading || !graceExpired || directLoading)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Conversation not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <MessageThread
        conversation={conversation}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        participantProfiles={participantProfiles}
      />
    </div>
  );
}

function ConversationPage() {
  return <ConversationContent />;
}
