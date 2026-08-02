import { useState } from "react";
import { ArrowLeft, MessageCircle, HeartHandshake } from "lucide-react";
import { useMessaging } from "@/context/MessagingContext";
import { usePlaydates } from "@/context/PlaydateContext";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatView } from "@/components/messaging/ChatView";
import { PlaydateChatView } from "@/components/messaging/PlaydateChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InboxTab = "adoptions" | "playdates";

const Inbox = () => {
  const { conversations, getMessages } = useMessaging();
  const { requests } = usePlaydates();
  const [tab, setTab] = useState<InboxTab>("adoptions");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedPlaydateId, setSelectedPlaydateId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedMessages = selectedConvId ? getMessages(selectedConvId) : [];
  const selectedPlaydate = requests.find((r) => r.id === selectedPlaydateId);

  const handleSelectConv = (id: string) => {
    setSelectedConvId(id);
    setSelectedPlaydateId(null);
  };

  const handleSelectPlaydate = (id: string) => {
    setSelectedPlaydateId(id);
    setSelectedConvId(null);
  };

  const handleBack = () => {
    setSelectedConvId(null);
    setSelectedPlaydateId(null);
  };

  // Tab bar component
  const TabBar = () => (
    <div className="flex items-center border-b border-border">
      <button
        onClick={() => { setTab("adoptions"); handleBack(); }}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2",
          tab === "adoptions"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageCircle className="h-4 w-4" />
        Adoptions
        {conversations.some((c) => c.unreadCount > 0) && (
          <Badge variant="default" className="h-5 px-1.5 text-[10px]">
            {conversations.reduce((s, c) => s + c.unreadCount, 0)}
          </Badge>
        )}
      </button>
      <button
        onClick={() => { setTab("playdates"); handleBack(); }}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2",
          tab === "playdates"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <HeartHandshake className="h-4 w-4" />
        Derpdates
        {requests.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {requests.length}
          </Badge>
        )}
      </button>
    </div>
  );

  // Derpdate list component
  const PlaydateList = () => {
    if (requests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="text-5xl mb-4">🐾</span>
          <h2 className="text-lg font-bold text-foreground mb-1">No derpdate chats yet</h2>
          <p className="text-sm text-muted-foreground">
            Request a derpdate from the Derpdates tab to start chatting!
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {requests.map((req) => {
          const isActive = req.id === selectedPlaydateId;
          const statusEmoji = req.status === "requested" ? "⏳" : req.status === "accepted" ? "✅" : req.status === "scheduled" ? "📅" : req.status === "completed" ? "🎉" : "❌";
          const lastMsg = req.chatMessages[req.chatMessages.length - 1];

          return (
            <button
              key={req.id}
              onClick={() => handleSelectPlaydate(req.id)}
              className={cn(
                "flex items-center gap-3 p-3 text-left transition-colors border-b border-border",
                isActive ? "bg-primary/10" : "hover:bg-muted/50"
              )}
            >
              <div className="relative shrink-0">
                <img
                  src={req.targetPetPhoto}
                  alt={req.targetPetName}
                  className="h-12 w-12 rounded-full object-cover border-2 border-border"
                />
                <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5 text-xs">
                  {statusEmoji}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground truncate">
                    {req.myPetName} × {req.targetPetName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  with {req.targetOwnerName}
                </p>
                {lastMsg && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMsg.text}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                {req.status}
              </Badge>
            </button>
          );
        })}
      </div>
    );
  };

  // Mobile layout
  if (isMobile) {
    if (selectedConv && tab === "adoptions") {
      return (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <div className="shrink-0 p-2 border-b border-border">
            <Button variant="ghost" size="sm" className="gap-1 text-sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <ChatView conversation={selectedConv} messages={selectedMessages} />
          </div>
        </div>
      );
    }

    if (selectedPlaydate && tab === "playdates") {
      return (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <div className="shrink-0 p-2 border-b border-border">
            <Button variant="ghost" size="sm" className="gap-1 text-sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <PlaydateChatView request={selectedPlaydate} />
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="p-4 pb-2">
          <h1 className="text-2xl font-extrabold text-foreground">Inbox</h1>
        </div>
        {FEATURES.adoption && <TabBar />}
        {tab === "adoptions" ? (
          <ConversationList conversations={conversations} selectedId={selectedConvId} onSelect={handleSelectConv} />
        ) : (
          <PlaydateList />
        )}
      </div>
    );
  }

  // Desktop: split view
  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* Left panel */}
      <div className="w-80 border-r border-border shrink-0 flex flex-col overflow-hidden">
        <div className="p-4 pb-2 shrink-0">
          <h1 className="text-xl font-extrabold text-foreground">Inbox</h1>
        </div>
        <TabBar />
        <div className="flex-1 overflow-y-auto">
          {tab === "adoptions" ? (
            <ConversationList conversations={conversations} selectedId={selectedConvId} onSelect={handleSelectConv} />
          ) : (
            <PlaydateList />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {tab === "adoptions" && selectedConv ? (
          <ChatView conversation={selectedConv} messages={selectedMessages} />
        ) : tab === "playdates" && selectedPlaydate ? (
          <PlaydateChatView request={selectedPlaydate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="text-5xl mb-4">{tab === "playdates" ? "🐾" : "💬"}</span>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {tab === "playdates" ? "Select a derpdate" : "Select a conversation"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "playdates"
                ? "Choose a derpdate chat to coordinate meetups!"
                : "Choose a chat to start messaging about a derp!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
