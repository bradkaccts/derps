import { type Conversation } from "@/data/mock-messages";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <span className="text-5xl mb-4">💬</span>
        <h2 className="text-lg font-bold text-foreground mb-1">No messages yet</h2>
        <p className="text-sm text-muted-foreground">
          Apply to adopt a derp and start chatting once you're accepted!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const isActive = conv.id === selectedId;
        const time = new Date(conv.lastMessageTime);
        const timeStr = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "flex items-center gap-3 p-3 text-left transition-colors border-b border-border",
              isActive ? "bg-primary/10" : "hover:bg-muted/50"
            )}
          >
            {/* Pet photo */}
            <div className="relative shrink-0">
              <img
                src={conv.petPhoto}
                alt={conv.petName}
                className="h-12 w-12 rounded-full object-cover border-2 border-border"
              />
              {conv.status === "scheduled" && (
                <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary p-0.5">
                  <CalendarCheck className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground truncate">
                  {conv.petName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {timeStr}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                with {conv.rehomerName}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessage}
              </p>
            </div>

            {/* Unread badge */}
            {conv.unreadCount > 0 && (
              <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs shrink-0 animate-wag">
                {conv.unreadCount}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
