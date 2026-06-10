import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";

export interface LastMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  organizationId: string | null;
  participants: string[];
  name: string | null;
  lastMessage: LastMessage | null;
  unreadCounts: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export function useConversations(userId: string | null, organizationId?: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // No orderBy here — the array-contains + orderBy combination requires a composite Firestore
    // index that may not exist. We fetch all conversations for the user and sort client-side.
    const q = query(
      collection(firestoreDb, "conversations"),
      where("participants", "array-contains", userId),
    );

    // Safety fallback: stop showing skeleton after 8 seconds even if Firestore is unresponsive
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(timeout);
        const allDocs = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            type: d.type as "direct" | "group",
            organizationId: d.organizationId ?? null,
            participants: d.participants ?? [],
            name: d.name ?? null,
            lastMessage: d.lastMessage
              ? {
                  ...d.lastMessage,
                  timestamp: d.lastMessage.timestamp?.toDate?.() ?? new Date(),
                }
              : null,
            unreadCounts: d.unreadCounts ?? {},
            createdAt: d.createdAt?.toDate?.() ?? new Date(),
            updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
            createdBy: d.createdBy ?? "",
          } satisfies Conversation;
        });

        // Filter by org workspace scope (client-side), then sort by most-recently-updated
        const scoped = organizationId
          ? allDocs.filter((c) => c.organizationId === organizationId)
          : allDocs;
        scoped.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        setConversations(scoped);
        setLoading(false);
      },
      () => {
        // On Firestore error (permissions, network) stop the loading skeleton
        clearTimeout(timeout);
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [userId, organizationId]);

  return { conversations, loading };
}
