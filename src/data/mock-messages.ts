export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  type: "text" | "meet-greet" | "check-in";
  meetGreet?: {
    date: string;
    time: string;
    location: string;
    status: "proposed" | "accepted" | "declined" | "completed";
  };
}

export interface Conversation {
  id: string;
  petId: string;
  petName: string;
  petPhoto: string;
  adopterId: string;
  adopterName: string;
  adopterAvatar: string;
  rehomerId: string;
  rehomerName: string;
  rehomerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: "active" | "scheduled" | "completed";
}

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    petId: "p1",
    petName: "Biscuit",
    petPhoto: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100&h=100&fit=crop",
    adopterId: "u1",
    adopterName: "Felix Adopter",
    adopterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rehomerId: "u2",
    rehomerName: "Fiona Rehomer",
    rehomerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    lastMessage: "He loves belly rubs! You'll be best friends 🐾",
    lastMessageTime: "2026-02-24T10:30:00",
    unreadCount: 2,
    status: "active",
  },
  {
    id: "c2",
    petId: "p5",
    petName: "Noodle",
    petPhoto: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop",
    adopterId: "u1",
    adopterName: "Felix Adopter",
    adopterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rehomerId: "u2",
    rehomerName: "Fiona Rehomer",
    rehomerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Saturday at 2pm works for me!",
    lastMessageTime: "2026-02-23T16:45:00",
    unreadCount: 0,
    status: "scheduled",
  },
  {
    id: "c3",
    petId: "p6",
    petName: "Chaos",
    petPhoto: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=100&h=100&fit=crop",
    adopterId: "u1",
    adopterName: "Felix Adopter",
    adopterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rehomerId: "u3",
    rehomerName: "Paul Rehomer",
    rehomerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Looking forward to meeting Chaos tomorrow!",
    lastMessageTime: "2026-02-22T09:15:00",
    unreadCount: 1,
    status: "active",
  },
];

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", conversationId: "c1", senderId: "u1", text: "Hi! I'm really interested in adopting Biscuit. He looks like such a sweetheart!", timestamp: "2026-02-24T09:00:00", type: "text" },
    { id: "m2", conversationId: "c1", senderId: "u2", text: "Hello Felix! Biscuit is the absolute sweetest. He's great with kids and other dogs too.", timestamp: "2026-02-24T09:15:00", type: "text" },
    { id: "m3", conversationId: "c1", senderId: "u1", text: "That's amazing! We have a big backyard — does he like to run around?", timestamp: "2026-02-24T09:30:00", type: "text" },
    { id: "m4", conversationId: "c1", senderId: "u2", text: "Oh he LOVES running! He does zoomies every morning. Your yard sounds perfect for him 🌿", timestamp: "2026-02-24T10:00:00", type: "text" },
    { id: "m5", conversationId: "c1", senderId: "u2", text: "He loves belly rubs! You'll be best friends 🐾", timestamp: "2026-02-24T10:30:00", type: "text" },
  ],
  c2: [
    { id: "m6", conversationId: "c2", senderId: "u1", text: "Hi Fiona! Noodle is adorable. Would love to learn more about her personality.", timestamp: "2026-02-23T14:00:00", type: "text" },
    { id: "m7", conversationId: "c2", senderId: "u2", text: "Noodle is the laziest, most lovable sausage dog you'll ever meet! She's a blanket burrito expert 😂", timestamp: "2026-02-23T14:30:00", type: "text" },
    { id: "m8", conversationId: "c2", senderId: "u1", text: "Ha! That sounds perfect. Could we set up a meet and greet?", timestamp: "2026-02-23T15:00:00", type: "text" },
    {
      id: "m9", conversationId: "c2", senderId: "u2", text: "Let's do it! How about this Saturday?", timestamp: "2026-02-23T15:30:00", type: "meet-greet",
      meetGreet: { date: "2026-03-01", time: "14:00", location: "Riverside Dog Park, San Francisco", status: "accepted" },
    },
    { id: "m10", conversationId: "c2", senderId: "u1", text: "Saturday at 2pm works for me!", timestamp: "2026-02-23T16:45:00", type: "text" },
  ],
  c3: [
    { id: "m11", conversationId: "c3", senderId: "u1", text: "Hey Paul! I saw Chaos's profile and I think he'd fit right in with our family 😄", timestamp: "2026-02-22T08:00:00", type: "text" },
    { id: "m12", conversationId: "c3", senderId: "u3", text: "He's a handful but SO rewarding. Fair warning: he WILL open your cabinets 😂", timestamp: "2026-02-22T08:30:00", type: "text" },
    { id: "m13", conversationId: "c3", senderId: "u1", text: "Haha we'll get child locks! Can we come meet him?", timestamp: "2026-02-22T09:00:00", type: "text" },
    { id: "m14", conversationId: "c3", senderId: "u1", text: "Looking forward to meeting Chaos tomorrow!", timestamp: "2026-02-22T09:15:00", type: "text" },
  ],
};
