import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  mockConversations,
  mockMessages,
  type Conversation,
  type Message,
} from "@/data/mock-messages";

interface MessagingContextValue {
  conversations: Conversation[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, text: string) => void;
  proposeMeetGreet: (
    conversationId: string,
    date: string,
    time: string,
    location: string
  ) => void;
  respondMeetGreet: (
    conversationId: string,
    messageId: string,
    accept: boolean
  ) => void;
  checkIn: (conversationId: string) => void;
  totalUnread: number;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);

  const getMessages = useCallback(
    (conversationId: string) => messages[conversationId] ?? [],
    [messages]
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      const msg: Message = {
        id: `m-${Date.now()}`,
        conversationId,
        senderId: "u1",
        text,
        timestamp: new Date().toISOString(),
        type: "text",
      };
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp, unreadCount: 0 }
            : c
        )
      );
    },
    []
  );

  const proposeMeetGreet = useCallback(
    (conversationId: string, date: string, time: string, location: string) => {
      const msg: Message = {
        id: `m-${Date.now()}`,
        conversationId,
        senderId: "u1",
        text: `📅 Meet & Greet proposed`,
        timestamp: new Date().toISOString(),
        type: "meet-greet",
        meetGreet: { date, time, location, status: "proposed" },
      };
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: "📅 Meet & Greet proposed", lastMessageTime: msg.timestamp }
            : c
        )
      );
    },
    []
  );

  const respondMeetGreet = useCallback(
    (conversationId: string, messageId: string, accept: boolean) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === messageId && m.meetGreet
            ? {
                ...m,
                meetGreet: {
                  ...m.meetGreet,
                  status: accept ? "accepted" : "declined",
                },
              }
            : m
        ),
      }));
      if (accept) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, status: "scheduled" } : c
          )
        );
      }
    },
    []
  );

  const checkIn = useCallback((conversationId: string) => {
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId,
      senderId: "u1",
      text: "✅ I've checked in — we met!",
      timestamp: new Date().toISOString(),
      type: "check-in",
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, status: "completed", lastMessage: "✅ Check-in confirmed!", lastMessageTime: msg.timestamp }
          : c
      )
    );
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        getMessages,
        sendMessage,
        proposeMeetGreet,
        respondMeetGreet,
        checkIn,
        totalUnread,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error("useMessaging must be used within MessagingProvider");
  return ctx;
}
