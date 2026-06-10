import { createContext, useContext } from "react";
import type { Conversation } from "@/hooks/use-conversations";

interface ChatContextValue {
  conversations: Conversation[];
  conversationsLoading: boolean;
  participantProfiles: Record<string, { name: string; avatarUrl: string | null }>;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}

export const ChatContext = createContext<ChatContextValue>({
  conversations: [],
  conversationsLoading: true,
  participantProfiles: {},
  currentUserId: "",
  currentUserName: "You",
  currentUserAvatar: null,
});

export const useChatContext = () => useContext(ChatContext);
