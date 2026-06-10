import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
  timestamp: Date;
  readBy: string[];
}

export function useMessages(conversationId: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);

    const q = query(
      collection(firestoreDb, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100),
    );

    // Safety fallback: stop showing loading skeleton after 5 seconds
    const timeout = setTimeout(() => setLoading(false), 5000);

    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timeout);
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar ?? null,
          text: data.text,
          timestamp: data.timestamp?.toDate?.() ?? new Date(),
          readBy: data.readBy ?? [],
        } satisfies ChatMessage;
      });
      setMessages(msgs);
      setLoading(false);

      // Collect messages the current user hasn't read yet
      const unreadDocs = snap.docs.filter((d) => {
        const readBy: string[] = d.data().readBy ?? [];
        return !readBy.includes(currentUserId);
      });

      if (unreadDocs.length > 0) {
        // Reset the conversation-level unread badge for this user
        updateDoc(doc(firestoreDb, "conversations", conversationId), {
          [`unreadCounts.${currentUserId}`]: 0,
        }).catch(() => {});

        // Mark each unread message as read
        unreadDocs.forEach((d) => {
          updateDoc(d.ref, { readBy: arrayUnion(currentUserId) }).catch(() => {});
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [conversationId, currentUserId]);

  return { messages, loading };
}
