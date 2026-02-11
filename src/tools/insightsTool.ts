import { tool } from "ai";
import { z } from "zod";

/**
 * Tool for reading insights from workspace memory
 * Client-side only - execution handled in useChatStream
 */
export const readInsightsTool = tool({
  description: `Read insights from workspace memory. Use this to recall previous findings, user goals, or important context.

Guidelines:
- Call this at the START of a conversation or when context seems missing
- Use 'general' for observations and patterns (most common)
- Use 'important' only for critical findings, anomalies, or key metrics
- Use 'user_goals' to check what the user specifically wants to achieve
- Don't overuse - read once at beginning, then rely on context`,
  inputSchema: z.object({
    type: z
      .enum(["important", "general", "user_goals"])
      .optional()
      .describe("Type of insights to read. Omit to get all types."),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of insights to return (default: 10)"),
    id: z
      .number()
      .optional()
      .describe("Specific insight ID to retrieve"),
  }),
  execute: async () => ({
    ok: true,
    message: "Tool execution handled client-side",
  }),
});

/**
 * Tool for writing insights to workspace memory
 * Client-side only - execution handled in useChatStream
 */
export const writeInsightTool = tool({
  description: `Write an insight to workspace memory. Use this to preserve findings across conversations.

CRITICAL USAGE GUIDELINES:
- Be SELECTIVE - don't save every minor observation
- 'general': Observations, patterns, data quality notes, helpful context (use most often)
- 'important': Critical findings, major anomalies, key metrics, significant correlations (use sparingly)
- 'user_goals': Anything the user SPECIFICALLY mentions they want, need, or are trying to achieve

Auto-save triggers:
- After completing significant analysis
- When user explicitly states goals or requirements
- When discovering something that would be valuable to remember
- When you find anomalies or key patterns

DO NOT save:
- Temporary calculations
- Obvious facts about the data
- Information already clearly in the dataset schema
- Every single query result

CRITICAL PARAMETER NAMES - USE EXACTLY AS SHOWN:
- type: The category (NOT 'category')
- context: The insight text (NOT 'content')`,
  inputSchema: z.object({
    type: z
      .enum(["important", "general", "user_goals"])
      .describe("REQUIRED. The insight category. Must be exactly: 'important', 'general', or 'user_goals'. Use 'type' NOT 'category'."),
    context: z
      .string()
      .describe("REQUIRED. The insight content/text to save. Use 'context' NOT 'content'. Be concise but specific."),
    source: z
      .string()
      .optional()
      .describe("Source of the insight (e.g., 'correlation analysis', 'user request')"),
    id: z
      .number()
      .optional()
      .describe("Existing insight ID to update. Omit to create new."),
  }),
  execute: async () => ({
    ok: true,
    message: "Tool execution handled client-side",
  }),
});

/**
 * Tool for deleting insights from workspace memory
 * Client-side only - execution handled in useChatStream
 */
export const deleteInsightTool = tool({
  description: `Delete an insight from workspace memory. Use this when an insight is incorrect, outdated, or no longer relevant.`,
  inputSchema: z.object({
    type: z
      .enum(["important", "general", "user_goals"])
      .describe("Type/category of the insight"),
    id: z.number().describe("ID of the insight to delete"),
  }),
  execute: async () => ({
    ok: true,
    message: "Tool execution handled client-side",
  }),
});


