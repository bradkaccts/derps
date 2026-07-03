import { useState, useRef, useEffect } from "react";
import { Send, CalendarPlus, CheckCircle2, MapPin, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Message, type Conversation } from "@/data/mock-messages";
import { useMessaging } from "@/context/MessagingContext";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
}

export function ChatView({ conversation, messages }: ChatViewProps) {
  const { sendMessage, proposeMeetGreet, respondMeetGreet, checkIn } = useMessaging();
  const [input, setInput] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetLocation, setMeetLocation] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(conversation.id, input.trim());
    setInput("");
  };

  const handlePropose = () => {
    if (!meetDate || !meetTime || !meetLocation.trim()) return;
    proposeMeetGreet(conversation.id, meetDate, meetTime, meetLocation.trim());
    setShowScheduler(false);
    setMeetDate("");
    setMeetTime("");
    setMeetLocation("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-border p-3 shrink-0">
        <img
          src={conversation.petPhoto}
          alt={conversation.petName}
          className="h-10 w-10 rounded-full object-cover border-2 border-border"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground">{conversation.petName}</h3>
          <p className="text-xs text-muted-foreground">
            with {conversation.rehomerName}
          </p>
        </div>
        <div className="flex gap-1.5">
          {conversation.status === "scheduled" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => checkIn(conversation.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Check In
            </Button>
          )}
          <Button
            variant={showScheduler ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setShowScheduler(!showScheduler)}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Derpdate</span>
          </Button>
        </div>
      </div>

      {/* Scheduler */}
      {showScheduler && (
        <div className="border-b border-border p-3 bg-secondary/30 shrink-0">
          <h4 className="text-sm font-bold text-foreground mb-2">
            📅 Propose a Derpdate
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Date</label>
              <Input
                type="date"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Time</label>
              <Input
                type="time"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <Input
                placeholder="Park, café, etc."
                value={meetLocation}
                onChange={(e) => setMeetLocation(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={handlePropose} disabled={!meetDate || !meetTime || !meetLocation.trim()}>
              Send Proposal
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowScheduler(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === "u1";

          if (msg.type === "meet-greet" && msg.meetGreet) {
            return (
              <MeetGreetCard
                key={msg.id}
                message={msg}
                isMe={isMe}
                onRespond={(accept) =>
                  respondMeetGreet(conversation.id, msg.id, accept)
                }
              />
            );
          }

          if (msg.type === "check-in") {
            return (
              <div key={msg.id} className="flex justify-center">
                <Badge variant="secondary" className="gap-1 font-semibold text-sm py-1.5 px-4">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {msg.text}
                </Badge>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}
              >
                {msg.text}
                <div
                  className={cn(
                    "text-[10px] mt-1 opacity-70",
                    isMe ? "text-right" : "text-left"
                  )}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MeetGreetCard({
  message,
  isMe,
  onRespond,
}: {
  message: Message;
  isMe: boolean;
  onRespond: (accept: boolean) => void;
}) {
  const mg = message.meetGreet!;
  const statusColors = {
    proposed: "border-accent bg-accent/10",
    accepted: "border-primary bg-primary/10",
    declined: "border-destructive bg-destructive/10",
    completed: "border-primary bg-primary/10",
  };
  const statusLabels = {
    proposed: "⏳ Proposed",
    accepted: "✅ Accepted",
    declined: "❌ Declined",
    completed: "🎉 Completed",
  };

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <Card className={cn("max-w-[85%] border-2", statusColors[mg.status])}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Derpdate</span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {statusLabels[mg.status]}
            </Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {new Date(mg.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {mg.time}
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {mg.location}
            </div>
          </div>
          {mg.status === "proposed" && !isMe && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="text-xs flex-1" onClick={() => onRespond(true)}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => onRespond(false)}
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
