import { createContext } from "react";
import type { Conversation, Message } from "@/data/mock-messages";

export interface MessagingContextValue {
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

export const MessagingContext = createContext<MessagingContextValue | null>(null);
