import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";
import { useMessages } from "@/hooks/use-messages";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Loader2, MoreVertical, Send, Trash2, Users, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendChatNotification, deleteConversation } from "@/server-fns/chat";
import type { Conversation } from "@/hooks/use-conversations";
import type { ChatMessage } from "@/hooks/use-messages";

interface Props {
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  participantProfiles: Record<string, { name: string; avatarUrl: string | null }>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface MessageGroup {
  type: "date" | "message";
  date?: string;
  message?: ChatMessage;
  showAvatar?: boolean;
  showName?: boolean;
}

function buildGroups(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let lastDate: Date | null = null;
  let lastSenderId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = msg.timestamp;

    // Date separator
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      groups.push({ type: "date", date: formatDateSeparator(msgDate) });
      lastDate = msgDate;
      lastSenderId = null;
    }

    const showAvatar = lastSenderId !== msg.senderId;
    const showName = showAvatar;
    groups.push({ type: "message", message: msg, showAvatar, showName });
    lastSenderId = msg.senderId;
  }

  return groups;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-1">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[11px] font-medium text-muted-foreground/80 shrink-0 tabular-nums">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

export function MessageThread({
  conversation,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  participantProfiles,
}: Props) {
  const navigate = useNavigate();
  const { messages, loading } = useMessages(conversation.id, currentUserId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const displayName =
    conversation.type === "group"
      ? (conversation.name ?? "Group chat")
      : (() => {
          const otherId = conversation.participants.find((id) => id !== currentUserId);
          return otherId ? (participantProfiles[otherId]?.name ?? "Unknown user") : "Unknown user";
        })();

  const otherAvatar =
    conversation.type === "direct"
      ? (() => {
          const otherId = conversation.participants.find((id) => id !== currentUserId);
          return otherId ? (participantProfiles[otherId]?.avatarUrl ?? null) : null;
        })()
      : null;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    try {
      await addDoc(collection(firestoreDb, "conversations", conversation.id, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar ?? null,
        text: trimmed,
        timestamp: serverTimestamp(),
        readBy: [currentUserId],
      });

      const otherParticipants = conversation.participants.filter((id) => id !== currentUserId);
      const unreadUpdate = Object.fromEntries(
        otherParticipants.map((id) => [
          `unreadCounts.${id}`,
          (conversation.unreadCounts[id] ?? 0) + 1,
        ]),
      );

      await updateDoc(doc(firestoreDb, "conversations", conversation.id), {
        lastMessage: {
          text: trimmed,
          senderId: currentUserId,
          senderName: currentUserName,
          timestamp: new Date(),
        },
        updatedAt: new Date(),
        ...unreadUpdate,
      });

      sendChatNotification({
        data: {
          toUserIds: otherParticipants,
          senderName: currentUserName,
          messageText: trimmed,
          conversationId: conversation.id,
        },
      }).catch(() => {});
    } catch {
      toast.error("Failed to send message");
      setText(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteConversation({ data: { conversationId: conversation.id } });
      toast.success("Conversation deleted");
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete conversation");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const groups = buildGroups(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 cursor-pointer"
          onClick={() => navigate({ to: "/chat" })}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {conversation.type === "group" ? (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-200/30 dark:border-violet-800/30 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-violet-500" />
          </div>
        ) : (
          <Avatar className="h-9 w-9 rounded-xl shrink-0">
            {otherAvatar && <AvatarImage src={otherAvatar} className="rounded-xl" />}
            <AvatarFallback className="rounded-xl text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-semibold text-[13px] truncate leading-none">{displayName}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            {conversation.type === "group"
              ? `${conversation.participants.length} members`
              : "Direct message"}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Conversation options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages with <strong>{displayName}</strong> will be permanently deleted for
              everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={cn("flex gap-2", i % 3 === 0 ? "flex-row-reverse" : "flex-row")}
              >
                <div className="h-7 w-7 rounded-lg bg-muted shrink-0" />
                <div className={cn("h-9 rounded-2xl bg-muted", i % 3 === 0 ? "w-32" : "w-48")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
              {conversation.type === "group" ? (
                <Users className="h-7 w-7 text-primary/50" />
              ) : (
                <Hash className="h-7 w-7 text-primary/50" />
              )}
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-sm">No Chat History Found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {conversation.type === "group"
                  ? `Be the first to send a message in ${displayName}.`
                  : `Send a message to start your conversation with ${displayName}.`}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {groups.map((item, i) =>
                item.type === "date" ? (
                  <DateSeparator key={`date-${item.date}-${i}`} label={item.date!} />
                ) : (
                  <div key={item.message!.id} className={item.showAvatar ? "mt-3" : "mt-0.5"}>
                    <MessageBubble
                      message={item.message!}
                      isOwn={item.message!.senderId === currentUserId}
                      showAvatar={item.showAvatar}
                      showName={conversation.type === "group" && item.showName}
                    />
                  </div>
                ),
              )}
            </AnimatePresence>
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 rounded-xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/40 transition-all duration-200 px-3 py-2">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${conversation.type === "group" ? displayName : displayName}…`}
            className="flex-1 min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            rows={1}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sending}
            className={cn(
              "h-8 w-8 shrink-0 rounded-lg transition-all duration-150 cursor-pointer",
              text.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
