import { Conversation, Message, ToolCall } from "@/types";
import { create } from "zustand";

interface ConversationStoreState {
  conversation: Conversation | null;
  messages: Message[];
  updateMessagesConversationId: (
    tempConvoId: string,
    realConvoId: string,
  ) => void;
  setConversations: (conversation: Conversation) => void;
  addMessage: (message: Message) => void;
  addStreamMessage: (
    delta:
      | string
      | { type: "reasoning" | "content"; text: string }
      | { type: "tool_call"; tool: ToolCall },
  ) => void;
  updateMessage: (tempId: string, newMessage: Message) => void;
  removeMessage: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversation: null,
  messages: [],
  updateMessagesConversationId: (tempConvoId: string, realConvoId: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.conversation_id === tempConvoId
          ? { ...msg, conversation_id: realConvoId }
          : msg,
      ),
    }));
  },
  setConversations: (conversation) => set({ conversation }),
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  addStreamMessage: (
    delta:
      | string
      | { type: "reasoning" | "content"; text: string }
      | { type: "tool_call"; tool: ToolCall },
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
      } else if (delta.type === "tool_call") {
        messages[lastIndex] = {
          ...last,
          tool_calls: [...(last.tool_calls || []), delta.tool],
        };
        updated = true;
      }

      if (!updated) return state;

      return { messages };
    }),
  updateMessage: (tempId: string, newMessage: Message) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === tempId ? { ...msg, ...newMessage } : msg,
      ),
    }));
  },

  removeMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },
  setMessages: (messages) => set({ messages }),
  reset: () => set({ conversation: null, messages: [] }),
}));
