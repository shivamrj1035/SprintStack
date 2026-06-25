import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SquarePen,
  Search,
  Users,
  MessageSquareDot,
  ChevronDown,
  Folder,
  FilePlus,
  FileCode,
  FileJson,
} from "lucide-react";
import type { Conversation } from "@/hooks/use-conversations";
import { useStealth } from "@/hooks/use-stealth";

interface Props {
  conversations: Conversation[];
  loading: boolean;
  currentUserId: string;
  participantProfiles: Record<string, { name: string; avatarUrl: string | null }>;
  onNewChat: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toStealthFileName(name: string, type: "direct" | "group"): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const extension = type === "group" ? "json" : "tsx";
  return `${cleanName || "chat"}.${extension}`;
}

export function ConversationList({
  conversations,
  loading,
  currentUserId,
  participantProfiles,
  onNewChat,
}: Props) {
  const params = useParams({ strict: false }) as { conversationId?: string };
  const activeId = params.conversationId;
  const [search, setSearch] = useState("");
  const { isStealth } = useStealth();

  const getDisplayName = (conv: Conversation) => {
    if (conv.type === "group") return conv.name ?? "Group chat";
    const otherId = conv.participants.find((id) => id !== currentUserId);
    return otherId ? (participantProfiles[otherId]?.name ?? "Unknown") : "Unknown";
  };

  const getAvatar = (conv: Conversation): string | null => {
    if (conv.type !== "direct") return null;
    const otherId = conv.participants.find((id) => id !== currentUserId);
    return otherId ? (participantProfiles[otherId]?.avatarUrl ?? null) : null;
  };

  const filtered = conversations.filter((c) =>
    search ? getDisplayName(c).toLowerCase().includes(search.toLowerCase()) : true,
  );

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCounts[currentUserId] ?? 0),
    0,
  );

  if (isStealth) {
    return (
      <div className="flex flex-col h-full bg-[#151515] text-[#d4d4d4] select-none text-[11px] font-mono border-r border-[#2d2d2d] w-full text-left">
        {/* Chats Folder Explorer Header */}
        <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-500 font-semibold select-none">
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              <Folder className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
              <span>src/chats</span>
              {totalUnread > 0 && (
                <span className="ml-2 h-4 min-w-[1rem] px-1 rounded bg-[#007acc] text-white text-[9px] font-bold flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewChat}
              title="git checkout -b new-chat"
              className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-[#2d2d2d] cursor-pointer"
              aria-label="New conversation"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search box styled as VS Code filter */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chats..."
              className="pl-7 pr-2 h-6 text-[10px] bg-[#1e1e1e] text-zinc-300 border-[#2d2d2d] focus-visible:ring-1 focus-visible:ring-[#007acc]/50 rounded-[1px] font-mono placeholder:text-zinc-600 w-full"
            />
          </div>
        </div>

        {/* List of Chat Files */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="px-2 py-1 space-y-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-5 bg-[#202020] animate-pulse rounded-[1px] w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 font-mono text-[10px]">
              {search ? "No matches found" : "No active chats"}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((conv) => {
                const name = getDisplayName(conv);
                const isActive = conv.id === activeId;
                const unread = conv.unreadCounts[currentUserId] ?? 0;
                const fileName = toStealthFileName(name, conv.type);

                return (
                  <li key={conv.id}>
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: conv.id }}
                      className={cn(
                        "flex items-center justify-between px-2 py-0.5 rounded-[1px] cursor-pointer transition-colors duration-100 font-mono text-[11px]",
                        isActive
                          ? "bg-[#2d2d2d] text-white font-medium border-l border-sky-400"
                          : "text-zinc-400 hover:bg-[#202020] hover:text-zinc-200",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {conv.type === "group" ? (
                          <FileJson className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        ) : (
                          <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        )}
                        <span className="truncate">{fileName}</span>
                      </div>

                      {unread > 0 && (
                        <span className="h-3.5 min-w-[0.875rem] px-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold flex items-center justify-center shrink-0 border border-emerald-500/30">
                          {unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[13px] tracking-tight">Messages</h2>
            {totalUnread > 0 && (
              <span className="h-4 min-w-[1rem] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            title="New conversation"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="New conversation"
          >
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="pl-8 h-8 text-xs bg-background/60 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-2.5 w-32 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
              <MessageSquareDot className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                {search ? "No results" : "No conversations yet"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {search ? `No chats match "${search}"` : "Click the pencil icon to start chatting"}
              </p>
            </div>
          </div>
        ) : (
          <ul className="px-2 pb-2 space-y-0.5">
            <AnimatePresence initial={false}>
              {filtered.map((conv) => {
                const name = getDisplayName(conv);
                const avatarUrl = getAvatar(conv);
                const unread = conv.unreadCounts[currentUserId] ?? 0;
                const isActive = conv.id === activeId;
                const lastMsgTime = conv.lastMessage?.timestamp
                  ? formatTime(conv.lastMessage.timestamp)
                  : null;

                return (
                  <motion.li
                    key={conv.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: conv.id }}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-150 group",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-accent/60 text-foreground",
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.type === "group" ? (
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-200/30 dark:border-violet-800/30 flex items-center justify-center">
                            <Users className="h-4 w-4 text-violet-500" />
                          </div>
                        ) : (
                          <Avatar className="h-9 w-9 rounded-xl">
                            {avatarUrl && <AvatarImage src={avatarUrl} className="rounded-xl" />}
                            <AvatarFallback className="rounded-xl text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                              {initials(name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={cn(
                              "text-[13px] truncate leading-none",
                              unread > 0 ? "font-semibold" : "font-medium",
                            )}
                          >
                            {name}
                          </span>
                          {lastMsgTime && (
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {lastMsgTime}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage ? (
                          <p
                            className={cn(
                              "text-[11px] truncate leading-none",
                              unread > 0
                                ? "text-foreground/80 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {conv.lastMessage.senderId === currentUserId
                              ? "You: "
                              : conv.type === "group"
                                ? `${conv.lastMessage.senderName}: `
                                : ""}
                            {conv.lastMessage.text}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/60 leading-none italic">
                            No messages yet
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
