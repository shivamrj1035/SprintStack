import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-messages";
import { useStealth } from "@/hooks/use-stealth";
import { obfuscateToCode, highlightSyntax } from "@/lib/stealth-utils";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar = true, showName = false }: Props) {
  const [showTime, setShowTime] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isStealth } = useStealth();

  const abbrev = message.senderName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const bubbleContent = (() => {
    if (!isStealth) {
      return (
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-[4px] shadow-primary/10"
              : "bg-card text-foreground rounded-bl-[4px] border border-border/60 dark:bg-muted/60",
          )}
        >
          {message.text}
        </div>
      );
    }

    return (
      <div className="relative max-w-full">
        <AnimatePresence mode="wait">
          {!isHovered ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="font-mono text-[11px] p-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-[3px] shadow-inner text-left overflow-x-auto min-w-[220px] max-w-full select-none"
            >
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#2d2d2d] text-zinc-500 text-[9px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                  <span className="truncate">
                    {message.senderName.toLowerCase().replace(/\s+/g, "_")}_payload.tsx
                  </span>
                </div>
                <span className="text-[8px] text-zinc-600 shrink-0">ts</span>
              </div>
              <div className="space-y-0.5 font-mono">
                {highlightSyntax(obfuscateToCode(message.text, message.id, message.senderName))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm transition-all duration-200 border text-left min-w-[220px]",
                isOwn
                  ? "bg-primary/20 border-primary/30 text-zinc-100"
                  : "bg-[#252526] border-[#3c3c3c] text-zinc-100",
              )}
            >
              <div className="text-[9px] text-emerald-500 mb-1 border-b border-zinc-800 pb-0.5 font-mono">
                {"// decrypted payload from " + message.senderName}
              </div>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
      className={cn("flex gap-2 items-end group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => {
        setShowTime(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setShowTime(false);
        setIsHovered(false);
      }}
    >
      {/* Avatar — always reserve space to keep bubbles aligned */}
      <div className="w-7 shrink-0 flex items-end justify-center">
        {!isOwn && showAvatar && (
          <Avatar className="h-7 w-7 rounded-lg">
            {message.senderAvatar && (
              <AvatarImage src={message.senderAvatar} className="rounded-lg" />
            )}
            <AvatarFallback className="rounded-lg text-[10px] font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {abbrev}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={cn("flex flex-col gap-0.5 max-w-[72%]", isOwn ? "items-end" : "items-start")}>
        {showName && !isOwn && (
          <span className="text-[11px] font-medium text-muted-foreground px-1 mb-0.5 font-mono">
            {message.senderName}
          </span>
        )}

        <div className="flex items-end gap-1.5 max-w-full">
          {isOwn && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: showTime ? 1 : 0 }}
              transition={{ duration: 0.1 }}
              className="text-[10px] text-muted-foreground tabular-nums shrink-0 pb-0.5"
            >
              {time}
            </motion.span>
          )}

          {bubbleContent}

          {!isOwn && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: showTime ? 1 : 0 }}
              transition={{ duration: 0.1 }}
              className="text-[10px] text-muted-foreground tabular-nums shrink-0 pb-0.5"
            >
              {time}
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
