export interface Conversation {
  id: string;
  workspace_id: string;
  title: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  description?: string; // Short 1-2 line description for UI display
  result?: string;
}

export type Message = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  role: MessageRole;
  reasoning: string | null;
  content: string;
  is_complete: boolean | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: Date | null;
  tool_calls?: ToolCall[];
  // AI SDK internals - not displayed in UI but required for tool result linking
  tool_call_id?: string | null;
  tool_name?: string | null;
};
