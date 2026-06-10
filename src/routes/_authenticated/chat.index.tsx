import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageSquareDot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center justify-center flex-1 w-full h-full gap-5 text-center px-8 bg-muted/20"
      >
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
            <MessageSquareDot className="h-7 w-7 text-primary/40" />
          </div>
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/20 border-2 border-background animate-pulse" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <p className="font-semibold text-sm text-foreground">Your messages</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select a conversation from the sidebar, or start a new one with the pencil icon.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
