import { useState, useRef, useEffect } from "react";
import { Send, CalendarPlus, CheckCircle2, MapPin, Clock, Calendar, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePlaydates, type PlaydateRequest } from "@/context/PlaydateContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaydateChatViewProps {
  request: PlaydateRequest;
}

export function PlaydateChatView({ request }: PlaydateChatViewProps) {
  const { sendPlaydateMessage, updateStatus, schedulePlaydate } = usePlaydates();
  const [input, setInput] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetLocation, setMeetLocation] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [request.chatMessages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendPlaydateMessage(request.id, input.trim());
    setInput("");
  };

  const handleSchedule = () => {
    if (!meetDate || !meetTime || !meetLocation.trim()) return;
    schedulePlaydate(request.id, { date: meetDate, time: meetTime, location: meetLocation.trim() });
    toast.success("Playdate scheduled! 📅🐾");
    setShowScheduler(false);
    setMeetDate("");
    setMeetTime("");
    setMeetLocation("");
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    requested: { label: "⏳ Pending", color: "bg-accent/10 text-accent-foreground" },
    accepted: { label: "✅ Accepted", color: "bg-primary/10 text-primary" },
    scheduled: { label: "📅 Scheduled", color: "bg-primary/10 text-primary" },
    completed: { label: "🎉 Completed", color: "bg-primary/10 text-primary" },
    declined: { label: "❌ Declined", color: "bg-destructive/10 text-destructive" },
  };

  const status = statusConfig[request.status] ?? statusConfig.requested;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3 shrink-0">
        <img
          src={request.targetPetPhoto}
          alt={request.targetPetName}
          className="h-10 w-10 rounded-full object-cover border-2 border-border"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{request.myPetName} 🐾 {request.targetPetName}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            with {request.targetOwnerName}
          </p>
        </div>
        <Badge variant="secondary" className={cn("text-xs", status.color)}>
          {status.label}
        </Badge>
        {request.status === "accepted" && (
          <Button
            variant={showScheduler ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setShowScheduler(!showScheduler)}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
        )}
        {request.status === "requested" && (
          <div className="flex gap-1">
            <Button size="sm" className="text-xs" onClick={() => {
              updateStatus(request.id, "accepted");
              toast.success("Playdate accepted! 🎉");
            }}>
              Accept
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
              updateStatus(request.id, "declined");
            }}>
              Decline
            </Button>
          </div>
        )}
        {request.status === "scheduled" && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => {
              updateStatus(request.id, "completed");
              toast.success("Playdate complete! Hope they had fun! 🎉");
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </Button>
        )}
      </div>

      {/* Scheduler */}
      {showScheduler && (
        <div className="border-b border-border p-3 bg-secondary/30 shrink-0">
          <h4 className="text-sm font-bold text-foreground mb-2">
            📅 Schedule the Playdate
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Date</label>
              <Input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Time</label>
              <Input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <Input placeholder="Dog park, café..." value={meetLocation} onChange={(e) => setMeetLocation(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={handleSchedule} disabled={!meetDate || !meetTime || !meetLocation.trim()}>
              Confirm Schedule
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowScheduler(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Schedule info card */}
      {request.schedule && (
        <div className="border-b border-border p-3 shrink-0">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <HeartHandshake className="h-4 w-4 text-primary" />
                Scheduled Playdate
              </div>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(request.schedule.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {request.schedule.time}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {request.schedule.location}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {request.chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-2">🐾</span>
            <p className="text-sm text-muted-foreground">
              Start chatting about your playdate!
            </p>
          </div>
        )}
        {request.chatMessages.map((msg) => {
          if (msg.senderId === "system") {
            return (
              <div key={msg.id} className="flex justify-center">
                <Badge variant="secondary" className="gap-1 font-semibold text-xs py-1 px-3">
                  {msg.text}
                </Badge>
              </div>
            );
          }

          const isMe = msg.senderId === "u1";
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}
              >
                {msg.text}
                <div className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-right" : "text-left")}>
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chat about the playdate..."
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
