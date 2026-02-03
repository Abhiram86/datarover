import { Conversation, Message } from "@/types";
import { create } from "zustand";

interface ConversationStoreState {
  conversation: Conversation | null;
  messages: Message[];
  setConversations: (conversation: Conversation) => void;
  addMessage: (message: Message) => void;
  addStreamMessage: (
    delta: string | { type: "reasoning" | "content"; text: string },
  ) => void;
  setMessages: (messages: Message[]) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversation: null,
  messages: [],
  setConversations: (conversation) => set({ conversation }),
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

      let updated = false;

      if (typeof delta === "string") {
        if (delta) {
          messages[lastIndex] = {
            ...last,
            content: last.content + delta,
          };
          updated = true;
        }
      } else if (delta.type === "reasoning" && delta.text) {
        messages[lastIndex] = {
          ...last,
          reasoning: (last.reasoning || "") + delta.text,
        };
        updated = true;
      } else if (delta.type === "content" && delta.text) {
        messages[lastIndex] = {
          ...last,
          content: last.content + delta.text,
        };
        updated = true;
      }

      if (!updated) return state;

      return { messages };
    }),
  setMessages: (messages) => set({ messages }),
  reset: () => set({ conversation: null, messages: [] }),
}));
