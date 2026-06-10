import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-messages";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar = true, showName = false }: Props) {
  const [showTime, setShowTime] = useState(false);

  const abbrev = message.senderName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
      className={cn("flex gap-2 items-end group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
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
          <span className="text-[11px] font-medium text-muted-foreground px-1 mb-0.5">
            {message.senderName}
          </span>
        )}

        <div className="flex items-end gap-1.5">
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
