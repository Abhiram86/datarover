import { useCallback } from "react";
import { generalChatStream } from "@/utils/chat.functions";
import { useSandboxStore } from "@/store/sandbox";
import { useConversationStore } from "@/store/conversation";
import type { ToolCall } from "@/types";

// Message type for the chat API
export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  // AI SDK internals - not displayed in UI but required for tool result linking
  tool_call_id?: string;
  tool_name?: string;
}

// Extended message type for database saving
export interface MessageToSave {
  role: "user" | "assistant" | "tool";
  content: string;
  reasoning?: string | null;
  tool_calls?: ToolCall[];
  // AI SDK internals - not displayed in UI but required for tool result linking
  tool_call_id?: string;
  tool_name?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  is_complete?: boolean;
  step_number?: number;
  is_final_response?: boolean;
}

export interface StreamResult {
  finalContent: string;
  finalReasoning: string | null;
  promptTokens: number;
  completionTokens: number;
  toolCalls: ToolCall[];
  messagesToSave: MessageToSave[];
  stepTempIds: string[];
}

export interface StreamEvent {
  type: "content" | "reasoning" | "reasoning-start" | "reasoning-end" | "tool_call" | "tool_result" | "usage" | "error" | "finish";
  text?: string;
  id?: string;
  name?: string;
  arguments?: string;
  result?: unknown;
  prompt_tokens?: number;
  completion_tokens?: number;
  error?: string;
  reason?: string;
}

interface StepState {
  stepCount: number;
  stepContent: string;
  stepReasoning: string;
  stepHadToolCall: boolean;
  stepToolCalls: ToolCall[];
}

interface StreamContext {
  messages: ChatMessage[];
  messagesToSave: MessageToSave[];
  stepTempIds: string[];
  promptTokens: number;
  completionTokens: number;
  allToolCalls: ToolCall[];
}

function initializeStepState(): StepState {
  return {
    stepCount: 0,
    stepContent: "",
    stepReasoning: "",
    stepHadToolCall: false,
    stepToolCalls: [],
  };
}

function createInitialContext(initialMessages: ChatMessage[]): StreamContext {
  const messagesToSave: MessageToSave[] = [];
  const lastUserMessage = initialMessages.filter(m => m.role === "user").pop();
  
  if (lastUserMessage) {
    messagesToSave.push({
      role: "user",
      content: lastUserMessage.content,
      is_complete: true,
    });
  }

  return {
    messages: [...initialMessages],
    messagesToSave,
    stepTempIds: [],
    promptTokens: 0,
    completionTokens: 0,
    allToolCalls: [],
  };
}

function initializeAssistantStep(
  stepCount: number,
  addMessage: (msg: {
    id: string;
    workspace_id: string;
    conversation_id: string;
    role: "assistant";
    content: string;
    reasoning: null;
    is_complete: boolean;
    prompt_tokens: null;
    completion_tokens: null;
    created_at: null;
  }) => void,
  newAssistantStep: (id: string) => void
): string {
  const tempAssistantId = `temp-assistant-step-${stepCount}-${Date.now()}`;
  newAssistantStep(tempAssistantId);
  
  addMessage({
    id: tempAssistantId,
    workspace_id: "workspace",
    conversation_id: "temp",
    role: "assistant",
    content: "",
    reasoning: null,
    is_complete: false,
    prompt_tokens: null,
    completion_tokens: null,
    created_at: null,
  });

  return tempAssistantId;
}

function handleStreamEvent(
  event: StreamEvent,
  stepState: StepState,
  context: StreamContext,
  tempAssistantId: string,
  addStreamMessage: (delta: string | { type: "reasoning" | "content"; text: string } | { type: "tool_call"; tool: ToolCall }, tempId?: string) => void,
  onStreamEvent: (event: StreamEvent) => void
): void {
  switch (event.type) {
    case "reasoning-start":
      onStreamEvent(event);
      break;

    case "reasoning":
      if (event.text) {
        stepState.stepReasoning += event.text;
        addStreamMessage({ type: "reasoning", text: event.text }, tempAssistantId);
        onStreamEvent(event);
      }
      break;

    case "reasoning-end":
      onStreamEvent(event);
      break;

    case "content":
      if (event.text) {
        stepState.stepContent += event.text;
        addStreamMessage({ type: "content", text: event.text }, tempAssistantId);
        onStreamEvent(event);
      }
      break;

    case "tool_call":
      if (event.id && event.name && event.arguments) {
        stepState.stepHadToolCall = true;
        const toolCall: ToolCall = {
          id: event.id,
          name: event.name,
          arguments: event.arguments,
        };
        stepState.stepToolCalls.push(toolCall);
        context.allToolCalls.push(toolCall);
        addStreamMessage({ type: "tool_call", tool: toolCall }, tempAssistantId);
        onStreamEvent(event);
      }
      break;

    case "tool_result":
      if (event.id && event.result) {
        const toolCall = stepState.stepToolCalls.find(tc => tc.id === event.id) || 
                        context.allToolCalls.find(tc => tc.id === event.id);
        if (toolCall) {
          toolCall.result = JSON.stringify(event.result);
        }
      }
      onStreamEvent(event);
      break;

    case "usage":
      context.promptTokens = event.prompt_tokens ?? context.promptTokens;
      context.completionTokens = event.completion_tokens ?? context.completionTokens;
      onStreamEvent(event);
      break;

    case "error":
      console.error("Stream error:", event.error);
      onStreamEvent(event);
      break;

    case "finish":
      onStreamEvent(event);
      break;
  }
}

function saveAssistantStepMessage(
  stepState: StepState,
  context: StreamContext,
  promptTokens: number,
  completionTokens: number
): void {
  context.messagesToSave.push({
    role: "assistant",
    content: stepState.stepContent,
    reasoning: stepState.stepReasoning || null,
    tool_calls: [...stepState.stepToolCalls],
    is_complete: false,
    step_number: stepState.stepCount,
    is_final_response: false,
  });

  if (!stepState.stepHadToolCall || stepState.stepToolCalls.length === 0) {
    if (stepState.stepContent) {
      const finalMsgIndex = context.messagesToSave.length - 1;
      context.messagesToSave[finalMsgIndex].is_complete = true;
      context.messagesToSave[finalMsgIndex].is_final_response = true;
      context.messagesToSave[finalMsgIndex].prompt_tokens = promptTokens;
      context.messagesToSave[finalMsgIndex].completion_tokens = completionTokens;
    }
  }
}

function addAssistantMessageToConversation(
  stepState: StepState,
  context: StreamContext
): void {
  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: stepState.stepContent || "I'll help you with that.",
    tool_calls: stepState.stepToolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    })),
  };
  context.messages.push(assistantMessage);
}

async function executeToolCall(
  toolCall: ToolCall,
  runPython: (code: string) => Promise<{ ok: boolean; result?: unknown; error?: unknown; consoleOutput?: string[] }>
): Promise<{ ok: boolean; result?: unknown; error?: unknown; consoleOutput?: string[] }> {
  if (toolCall.name === "run_python") {
    try {
      const args = JSON.parse(toolCall.arguments);
      const toolResult = await runPython(args.code);
      toolCall.result = JSON.stringify(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error: execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = JSON.stringify(toolResult);
      console.error(`[Chat Stream] run_python error:`, toolResult.error);
      return toolResult;
    }
  }

  return toolCall.result 
    ? JSON.parse(toolCall.result)
    : { ok: true, result: "Executed on server" };
}

function addToolResultToConversation(
  toolCall: ToolCall,
  toolResult: { ok: boolean; result?: unknown; error?: unknown; consoleOutput?: string[] },
  context: StreamContext
): void {
  const toolMessage: ChatMessage = {
    role: "tool",
    content: JSON.stringify(toolResult),
    tool_call_id: toolCall.id,
    tool_name: toolCall.name,
  };
  context.messages.push(toolMessage);

  context.messagesToSave.push({
    role: "tool",
    content: JSON.stringify(toolResult),
    tool_call_id: toolCall.id,
    tool_name: toolCall.name,
    is_complete: true,
  });
}

function extractFinalResults(context: StreamContext): { finalContent: string; finalReasoning: string | null } {
  const finalAssistantMsg = context.messagesToSave
    .filter(m => m.role === "assistant" && m.is_final_response)
    .pop();
  
  if (finalAssistantMsg) {
    return {
      finalContent: finalAssistantMsg.content,
      finalReasoning: finalAssistantMsg.reasoning || null,
    };
  }

  return { finalContent: "", finalReasoning: null };
}

export function useChatStream() {
  const addStreamMessage = useConversationStore((s) => s.addStreamMessage);
  const newAssistantStep = useConversationStore((s) => s.newAssistantStep);
  const addMessage = useConversationStore((s) => s.addMessage);
  const runPython = useSandboxStore((s) => s.runPythonSafe);

  const readChatStream = useCallback(
    async (
      initialMessages: ChatMessage[],
      onStreamEvent: (event: StreamEvent) => void
    ): Promise<StreamResult> => {
      const MAX_STEPS = 3;
      const context = createInitialContext(initialMessages);
      const stepState = initializeStepState();

      try {
        while (stepState.stepCount < MAX_STEPS) {
          stepState.stepCount++;

          const tempAssistantId = initializeAssistantStep(
            stepState.stepCount,
            addMessage,
            newAssistantStep
          );
          context.stepTempIds.push(tempAssistantId);

          stepState.stepContent = "";
          stepState.stepReasoning = "";
          stepState.stepHadToolCall = false;
          stepState.stepToolCalls = [];

          const stream = await generalChatStream({ data: { messages: context.messages } });

          for await (const chunk of stream) {
            const lines = chunk.split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const event = JSON.parse(line) as StreamEvent;
                handleStreamEvent(
                  event,
                  stepState,
                  context,
                  tempAssistantId,
                  addStreamMessage,
                  onStreamEvent
                );
              } catch (error) {
                console.error("[Chat Stream] Failed to parse stream chunk:", line, error);
              }
            }
          }

          saveAssistantStepMessage(
            stepState,
            context,
            context.promptTokens,
            context.completionTokens
          );

          if (!stepState.stepHadToolCall || stepState.stepToolCalls.length === 0) {
            break;
          }

          addAssistantMessageToConversation(stepState, context);

          for (const toolCall of stepState.stepToolCalls) {
            const toolResult = await executeToolCall(toolCall, runPython);
            addToolResultToConversation(toolCall, toolResult, context);
          }
        }

        const { finalContent, finalReasoning } = extractFinalResults(context);

        return {
          finalContent,
          finalReasoning,
          promptTokens: context.promptTokens,
          completionTokens: context.completionTokens,
          toolCalls: context.allToolCalls,
          messagesToSave: context.messagesToSave,
          stepTempIds: context.stepTempIds,
        };
      } catch (error) {
        console.error("[Chat Stream] Error:", error);
        throw error;
      }
    },
    [addStreamMessage, newAssistantStep, addMessage, runPython]
  );

  return readChatStream;
}
