import { useCallback } from "react";
import { generalChatStream } from "@/utils/chat.functions";
import { useSandboxStore } from "@/store/sandbox";
import { useConversationStore } from "@/store/conversation";
import { useNotebookStore } from "@/store/notebook";
import { useAbortStore } from "@/store/abort";
import type { ToolCall, ToolResult } from "@/types";
import { useDuckDBStore } from "@/store/duckdb";
import {
  readInsightsTool,
  writeInsightTool,
  deleteInsightTool,
} from "@/tools/insights";
import { isMutationQuery } from "@/tools/duckb";
import { showMutationConfirmation } from "@/components/MutationConfirmation";
import { useSandboxRetry } from "./useSandboxRetry";

interface InternalToolResult {
  ok: boolean;
  result?: unknown;
  images?: { name: string; url: string }[] | null;
  error?: unknown;
  consoleOutput?: string[];
}

function toTypedResult(internal: {
  ok?: boolean;
  result?: unknown;
  message?: unknown;
  error?: unknown;
  images?: unknown;
  consoleOutput?: string[];
}): ToolResult {
  if (internal.error) {
    return { type: "other", error: String(internal.error) };
  }
  const imgs = internal.images as { name: string; url: string }[] | undefined;
  if (imgs && imgs.length > 0) {
    return {
      type: "image",
      images: imgs,
      consoleOutput: internal.consoleOutput,
    };
  }
  const value = internal.result ?? internal.message ?? "";
  let valueString: string;
  if (typeof value === "string") {
    valueString = value;
  } else if (typeof value === "object" && value !== null) {
    valueString = JSON.stringify(value, null, 2);
  } else {
    valueString = String(value);
  }
  return {
    type: "text",
    value: valueString,
    consoleOutput: internal.consoleOutput,
  };
}

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
      description?: string; // Short 1-2 line description for UI display
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
  type:
    | "content"
    | "reasoning"
    | "reasoning-start"
    | "reasoning-end"
    | "tool_call"
    | "tool_result"
    | "usage"
    | "error"
    | "finish";
  text?: string;
  id?: string;
  name?: string;
  arguments?: string;
  description?: string; // Short 1-2 line description for UI display
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
  stepHadError: boolean;
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
    stepHadError: false,
  };
}

function createInitialContext(initialMessages: ChatMessage[]): StreamContext {
  const messagesToSave: MessageToSave[] = [];
  const lastUserMessage = initialMessages
    .filter((m) => m.role === "user")
    .pop();

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
  newAssistantStep: (id: string) => void,
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
  addStreamMessage: (
    delta:
      | string
      | { type: "reasoning" | "content"; text: string }
      | { type: "tool_call"; tool: ToolCall },
    tempId?: string,
  ) => void,
  onStreamEvent: (event: StreamEvent) => void,
): void {
  switch (event.type) {
    case "reasoning-start":
      onStreamEvent(event);
      break;

    case "reasoning":
      if (event.text) {
        stepState.stepReasoning += event.text;
        addStreamMessage(
          { type: "reasoning", text: event.text },
          tempAssistantId,
        );
        onStreamEvent(event);
      }
      break;

    case "reasoning-end":
      onStreamEvent(event);
      break;

    case "content":
      if (event.text) {
        stepState.stepContent += event.text;
        addStreamMessage(
          { type: "content", text: event.text },
          tempAssistantId,
        );
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
          description: event.description,
        };
        stepState.stepToolCalls.push(toolCall);
        context.allToolCalls.push(toolCall);
        addStreamMessage(
          { type: "tool_call", tool: toolCall },
          tempAssistantId,
        );
        onStreamEvent(event);
      }
      break;

    case "tool_result":
      if (event.id && event.result) {
        const toolCall =
          stepState.stepToolCalls.find((tc) => tc.id === event.id) ||
          context.allToolCalls.find((tc) => tc.id === event.id);
        if (toolCall) {
          toolCall.result = toTypedResult(event.result as InternalToolResult);
        }
      }
      onStreamEvent(event);
      break;

    case "usage":
      context.promptTokens = event.prompt_tokens ?? context.promptTokens;
      context.completionTokens =
        event.completion_tokens ?? context.completionTokens;
      onStreamEvent(event);
      break;

    case "error":
      console.error("Stream error:", event.error);
      stepState.stepHadError = true;
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
  completionTokens: number,
  aborted: boolean = false,
): void {
  context.messagesToSave.push({
    role: "assistant",
    content: stepState.stepContent,
    reasoning: stepState.stepReasoning || null,
    tool_calls: stepState.stepToolCalls,
    is_complete: !stepState.stepHadError || aborted,
    step_number: stepState.stepCount,
    is_final_response: false,
  });

  if (!stepState.stepHadToolCall || stepState.stepToolCalls.length === 0) {
    if (stepState.stepContent) {
      const finalMsgIndex = context.messagesToSave.length - 1;
      context.messagesToSave[finalMsgIndex].is_complete = true;
      context.messagesToSave[finalMsgIndex].is_final_response = true;
      context.messagesToSave[finalMsgIndex].prompt_tokens = promptTokens;
      context.messagesToSave[finalMsgIndex].completion_tokens =
        completionTokens;
    }
  }
}

function addAssistantMessageToConversation(
  stepState: StepState,
  context: StreamContext,
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
  runPythonWithRetry: (
    code: string,
    waitForSandbox: () => Promise<void>,
    timeout?: number,
  ) => Promise<{
    ok: boolean;
    result?: unknown;
    images?: string[];
    error?: unknown;
    consoleOutput?: string[];
  }>,
  waitForSandbox: () => Promise<void>,
  runDuckDB: (
    query: string,
  ) => Promise<{ ok: boolean; result?: unknown; error?: unknown }>,
  skipConfirmation: boolean = false,
): Promise<{
  ok: boolean;
  result?: unknown;
  images?: { name: string; url: string }[] | null;
  error?: unknown;
  consoleOutput?: string[];
}> {
  if (toolCall.name === "run_python") {
    try {
      const args = JSON.parse(toolCall.arguments);

      // Use retry logic - waits for sandbox with countdown toast
      const toolResult = await runPythonWithRetry(args.code, waitForSandbox);

      // Check for sandbox errors that should stop the stream
      if (
        toolResult.error === "SANDBOX_DISMISSED" ||
        toolResult.error === "SANDBOX_MAX_RETRIES"
      ) {
        console.error("[Chat Stream] Sandbox unavailable:", toolResult.error);
        // Stop the stream by throwing an error - don't waste agent tokens
        throw new Error(`SANDBOX_UNAVAILABLE: ${toolResult.error}`);
      }

      // Handle images - just use base64 URLs directly
      let formattedImages = null;
      try {
        if (
          toolResult.images &&
          Array.isArray(toolResult.images) &&
          toolResult.images.length > 0
        ) {
          formattedImages = toolResult.images.map((base64, idx) => {
            if (typeof base64 !== "string") {
              console.error(
                "[Chat Stream] Invalid base64 type:",
                typeof base64,
              );
              return { name: `plot_${idx + 1}.png`, url: "" };
            }
            return {
              name: `plot_${idx + 1}.png`,
              url: base64.startsWith("data:")
                ? base64
                : `data:image/png;base64,${base64}`,
            };
          });
        }
      } catch (imgErr) {
        console.error("[Chat Stream] Error formatting images:", imgErr);
      }

      const enhancedResult = {
        ...toolResult,
        images: formattedImages,
      };

      // Store code and output in notebook
      const notebookStore = useNotebookStore.getState();
      const parsedArgs = JSON.parse(toolCall.arguments);
      const outputType = toolResult.error ? "error" : formattedImages?.length ? "image" : "text";
      const outputText = toolResult.error 
        ? String(toolResult.error) 
        : toolResult.result 
          ? JSON.stringify(toolResult.result, null, 2) 
          : toolResult.consoleOutput?.join("\n") || "";
      
      notebookStore.addBlock(
        parsedArgs.code,
        outputText,
        outputType,
        formattedImages?.map((img: { url: string }) => img.url)
      );

      toolCall.result = toTypedResult(enhancedResult);

      return enhancedResult;
    } catch (execError) {
      const errorMessage = execError instanceof Error ? execError.message : "Execution failed";
      const toolResult = {
        ok: false,
        error: errorMessage,
        images: null,
        result: undefined,
        consoleOutput: undefined,
      };

      // Store error in notebook
      try {
        const notebookStore = useNotebookStore.getState();
        const parsedArgs = JSON.parse(toolCall.arguments);
        notebookStore.addBlock(
          parsedArgs.code,
          errorMessage,
          "error",
          []
        );
      } catch {
        // Ignore notebook storage errors
      }

      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] run_python error:`, toolResult.error);
      return toolResult;
    }
  }

  if (toolCall.name === "run_duckdb") {
    try {
      const args = JSON.parse(toolCall.arguments);

      // Check if this is a mutation query
      const isMutation = isMutationQuery(args.query);

      if (isMutation && !skipConfirmation) {
        // Show confirmation toast for mutations
        const confirmed = await showMutationConfirmation({
          toolName: "run_duckdb",
          description: args.description,
          query: args.query,
        });

        if (!confirmed) {
          // User rejected the mutation
          const toolResult = {
            ok: false,
            error: "user aborted request for manipulation",
          };
          toolCall.result = toTypedResult(toolResult);
          return toolResult;
        }
      }

      const toolResult = await runDuckDB(args.query);

      if (toolResult.ok && isMutation) {
        await useDuckDBStore.getState().triggerMutationCallback();
      }

      toolCall.result = toTypedResult(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error:
          execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] run_duckdb error:`, toolResult.error);
      return toolResult;
    }
  }

  // Insights tools - client-side execution
  if (toolCall.name === "read_insights") {
    try {
      const args = JSON.parse(toolCall.arguments);
      const toolResult = await readInsightsTool(args);
      toolCall.result = toTypedResult(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error:
          execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] read_insights error:`, toolResult.error);
      return toolResult;
    }
  }

  if (toolCall.name === "write_insight") {
    try {
      const args = JSON.parse(toolCall.arguments);
      const toolResult = await writeInsightTool(args);
      toolCall.result = toTypedResult(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error:
          execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] write_insight error:`, toolResult.error);
      return toolResult;
    }
  }

  if (toolCall.name === "delete_insight") {
    try {
      const args = JSON.parse(toolCall.arguments);
      const toolResult = await deleteInsightTool(args);
      toolCall.result = toTypedResult(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error:
          execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] delete_insight error:`, toolResult.error);
      return toolResult;
    }
  }

  // Notebook read_code - client-side execution
  if (toolCall.name === "read_code") {
    try {
      const args = JSON.parse(toolCall.arguments);
      const notebookStore = useNotebookStore.getState();

      let blocks;
      if (args.head !== undefined) {
        blocks = notebookStore.getHead(args.head);
      } else if (args.tail !== undefined) {
        blocks = notebookStore.getTail(args.tail);
      } else if (args.blockId !== undefined) {
        const block = notebookStore.getBlock(args.blockId);
        blocks = block ? [block] : [];
      } else {
        const toolResult = {
          ok: false,
          error: "Must specify head, tail, or blockId",
        };
        toolCall.result = toTypedResult(toolResult);
        return toolResult;
      }

      if (blocks.length === 0) {
        const toolResult = {
          ok: true,
          result: "No code blocks found in the notebook session.",
        };
        toolCall.result = toTypedResult(toolResult);
        return toolResult;
      }

      const formatted = blocks
        .map(
          (block, idx) =>
            `--- Block ${idx + 1} ---\nCode:\n${block.code}\n\nOutput:\n${block.output}${
              block.images && block.images.length > 0
                ? `\n\nImages: ${block.images.length} image(s) generated`
                : ""
            }`
        )
        .join("\n\n");

      const toolResult = {
        ok: true,
        result: formatted,
      };
      toolCall.result = toTypedResult(toolResult);
      return toolResult;
    } catch (execError) {
      const toolResult = {
        ok: false,
        error:
          execError instanceof Error ? execError.message : "Execution failed",
      };
      toolCall.result = toTypedResult(toolResult);
      console.error(`[Chat Stream] read_code error:`, toolResult.error);
      return toolResult;
    }
  }

  return toolCall.result
    ? {
        ok: true,
        result: toolCall.result.type === 'text' ? toolCall.result.value : undefined,
        error: toolCall.result.type === 'other' ? toolCall.result.error : undefined,
        images: toolCall.result.type === 'image' ? toolCall.result.images : undefined,
        consoleOutput: toolCall.result.consoleOutput,
      }
    : { ok: true, result: "Executed on server" };
}

function addToolResultToConversation(
  toolCall: ToolCall,
  toolResult: {
    ok: boolean;
    result?: unknown;
    images?: { name: string; url: string }[] | null;
    error?: unknown;
    consoleOutput?: string[];
  },
  context: StreamContext,
): void {
  // Store the result in the toolCall for saving with the assistant message
  toolCall.result = toTypedResult(toolResult);

  // For Model Context: minimal text only (prevent base64 pollution)
  const modelResult = {
    ok: toolResult.ok,
    result: toolResult.result,
    error: toolResult.error,
    consoleOutput: toolResult.consoleOutput,
    visualization:
      toolResult.images && toolResult.images.length > 0
        ? `Generated ${toolResult.images.length} visualization(s): ${toolResult.images.map((img) => img.name).join(", ")}. Note: You cannot view images as a text-based model.`
        : undefined,
  };

  // Add tool message to conversation for current AI turn
  const toolMessage: ChatMessage = {
    role: "tool",
    content: JSON.stringify(modelResult),
    tool_call_id: toolCall.id,
    tool_name: toolCall.name,
  };
  context.messages.push(toolMessage);
}

function extractFinalResults(context: StreamContext): {
  finalContent: string;
  finalReasoning: string | null;
} {
  const finalAssistantMsg = context.messagesToSave
    .filter((m) => m.role === "assistant" && m.is_final_response)
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
  const completeAssistantStep = useConversationStore(
    (s) => s.completeAssistantStep,
  );
  const addMessage = useConversationStore((s) => s.addMessage);
  const runPythonWithRetry = useSandboxStore((s) => s.runPythonWithRetry);
  const query = useDuckDBStore((s) => s.query);
  const { waitForSandbox } = useSandboxRetry();

  const readChatStream = useCallback(
    async (
      initialMessages: ChatMessage[],
      onStreamEvent: (event: StreamEvent) => void,
    ): Promise<StreamResult> => {
      const MAX_STEPS = 50;
      const context = createInitialContext(initialMessages);
      const stepState = initializeStepState();

      try {
        while (stepState.stepCount < MAX_STEPS) {
          stepState.stepCount++;

          const tempAssistantId = initializeAssistantStep(
            stepState.stepCount,
            addMessage,
            newAssistantStep,
          );
          context.stepTempIds.push(tempAssistantId);

          stepState.stepContent = "";
          stepState.stepReasoning = "";
          stepState.stepHadToolCall = false;
          stepState.stepToolCalls = [];
          stepState.stepHadError = false;

          const stream = await generalChatStream({
            data: { messages: context.messages },
          });

          for await (const chunk of stream) {
            if (useAbortStore.getState().isAborted) {
              break;
            }

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
                  onStreamEvent,
                );
              } catch (error) {
                console.error(
                  "[Chat Stream] Failed to parse stream chunk:",
                  line,
                  error,
                );
              }
            }
          }

          const wasAborted = useAbortStore.getState().isAborted;

          completeAssistantStep(tempAssistantId);

          saveAssistantStepMessage(
            stepState,
            context,
            context.promptTokens,
            context.completionTokens,
            wasAborted,
          );

          if (wasAborted) {
            useAbortStore.getState().reset();
          }

          if (
            !stepState.stepHadToolCall ||
            stepState.stepToolCalls.length === 0
          ) {
            break;
          }

          addAssistantMessageToConversation(stepState, context);

          for (const toolCall of stepState.stepToolCalls) {
            const toolResult = await executeToolCall(
              toolCall,
              runPythonWithRetry,
              () => waitForSandbox(() => useSandboxStore.getState().ready),
              query,
            );
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
    [
      addStreamMessage,
      newAssistantStep,
      completeAssistantStep,
      addMessage,
      runPythonWithRetry,
      query,
      useSandboxStore,
    ],
  );

  return readChatStream;
}
