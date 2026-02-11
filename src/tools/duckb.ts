import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

/**
 * Check if a query is a mutation (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER)
 */
export function isMutationQuery(query: string): boolean {
  const mutationKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "REPLACE",
  ];
  const normalizedQuery = query.trim().toUpperCase();
  return mutationKeywords.some((keyword) =>
    normalizedQuery.startsWith(keyword) ||
    normalizedQuery.includes(` ${keyword} `)
  );
}

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
    description: z
      .string()
      .optional()
      .describe(
        "Brief explanation of what the query does. Recommended for mutations (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER) to inform the user and provide context. Optional for read-only queries (SELECT).",
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
