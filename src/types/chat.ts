export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatRole = "user" | "assistant" | "tool";

export interface BaseMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  reasoning?: string;
  content: string;
  createdAt: Date;
}

export interface UserMessage extends BaseMessage {
  role: "user";
  promptTokens: number;
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  isComplete: boolean;
  completionTokens: number;
}

export interface ToolMessage extends BaseMessage {
  role: "tool";
  toolName: string;
  toolCallId?: string;
}

export type Message = UserMessage | AssistantMessage | ToolMessage;
