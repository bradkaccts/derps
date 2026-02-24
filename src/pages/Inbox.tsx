import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useMessaging } from "@/context/MessagingContext";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatView } from "@/components/messaging/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const Inbox = () => {
  const { conversations, getMessages } = useMessaging();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const selectedMessages = selectedId ? getMessages(selectedId) : [];

  // Mobile: show list or chat. Desktop: side-by-side.
  if (isMobile) {
    if (selectedConv) {
      return (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <div className="shrink-0 p-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-sm"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <ChatView conversation={selectedConv} messages={selectedMessages} />
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="p-4 pb-2">
          <h1 className="text-2xl font-extrabold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    );
  }

  // Desktop: split view
  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* Conversation list */}
      <div className="w-80 border-r border-border shrink-0 overflow-y-auto">
        <div className="p-4 pb-2">
          <h1 className="text-xl font-extrabold text-foreground">Inbox</h1>
          <p className="text-xs text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {selectedConv ? (
          <ChatView conversation={selectedConv} messages={selectedMessages} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="text-5xl mb-4">🐾</span>
            <h2 className="text-lg font-bold text-foreground mb-1">
              Select a conversation
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a chat to start messaging about a derp!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
