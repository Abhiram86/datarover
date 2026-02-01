import { Conversation, Message } from "@/types";
import { create } from "zustand";

interface ConversationStoreState {
  conversations: Conversation[];
  messages: Message[];
  setConversations: (conversations: Conversation[]) => void;
  addMessage: (message: Message) => void;
  addStreamMessage: (
    delta: string | { type: "reasoning" | "content"; text: string },
  ) => void;
  setMessages: (messages: Message[]) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversations: [],
  messages: [],
  setConversations: (conversations) => set({ conversations }),
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  addStreamMessage: (
    delta: string | { type: "reasoning" | "content"; text: string },
  ) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;

      if (lastIndex < 0) return state;

      const last = messages[lastIndex];
      if (last.role !== "assistant") return state;

      // Handle string (backward compatibility) or object
      if (typeof delta === "string") {
        messages[lastIndex] = {
          ...last,
          content: last.content + delta,
        };
      } else if (delta.type === "reasoning") {
        messages[lastIndex] = {
          ...last,
          reasoning: (last.reasoning || "") + delta.text,
        };
      } else if (delta.type === "content") {
        messages[lastIndex] = {
          ...last,
          content: last.content + delta.text,
        };
      }

      return { messages };
    }),
  setMessages: (messages) => set({ messages }),
  reset: () => set({ conversations: [], messages: [] }),
}));
