import type { ToolSet } from "ai";

// Import tool definitions
import { webSearchTool } from "./webSearch";
import { webFetchTool } from "./webFetch";
import {
  readInsightsTool,
  writeInsightTool,
  deleteInsightTool,
} from "./insightsTool";

// Re-export individual tool definitions
export { runPythonTool } from "./runPython";
export { runDuckDBTool } from "./duckb";
export { webSearchTool } from "./webSearch";
export { webFetchTool } from "./webFetch";
export {
  readInsightsTool,
  writeInsightTool,
  deleteInsightTool,
} from "./insightsTool";

/**
 * Tool execution result shape
 */
export interface ToolResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  consoleOutput?: string[];
}

/**
 * Context passed to tool executions
 */
export interface ToolContext {
  runPython?: (code: string) => Promise<ToolResult>;
  runDuckDB?: (query: string) => Promise<ToolResult>;
}

/**
 * Type for tool call tracking
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  description?: string; // Short 1-2 line description for UI display
  result?: string;
}

/**
 * Stream event types
 */
export type StreamEvent =
  | { type: "text-delta"; textDelta: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCall: ToolCall }
  | { type: "tool-result"; toolCallId: string; result: ToolResult }
  | {
      type: "finish";
      usage: { promptTokens: number; completionTokens: number };
    }
  | { type: "error"; error: string };

/**
 * ToolSet for AI SDK
 * Note: run_python, run_duckdb, and insights tools are client-side only and handled separately
 */
export const tools: ToolSet = {
  search_web: webSearchTool,
  fetch_url: webFetchTool,
  read_insights: readInsightsTool,
  write_insight: writeInsightTool,
  delete_insight: deleteInsightTool,
};

/**
 * Get all available tools as a ToolSet for AI SDK
 * Note: This returns server-side executable tools. run_python is handled client-side.
 */
export function getTools(_context: ToolContext): ToolSet {
  return tools;
}
