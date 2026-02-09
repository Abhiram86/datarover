import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

/**
 * Tool for executing Python code in a browser-based Pyodide sandbox
 */
export const runDuckDBTool = tool({
  description:
    "Manipulate and query dataset using DuckDB. Use this for data analysis, transformations, and calculations.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "DuckDB query to execute. Can include CREATE TABLE, INSERT, SELECT, and any valid DuckDB syntax.",
      ),
  }),
  execute: async (): Promise<ToolResult> => {
    // Note: Actual execution happens client-side via useChatStream hook
    // This is just a placeholder for type compatibility
    return {
      ok: true,
      result: "DuckDB execution handled client-side",
    };
  },
});

export default runDuckDBTool;
