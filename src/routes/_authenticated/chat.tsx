import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatLayout } from "@/components/chat/ChatLayout";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatParentLayout,
});

function ChatParentLayout() {
  return (
    <ChatLayout>
      <Outlet />
    </ChatLayout>
  );
}
