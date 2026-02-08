import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

/**
 * Tool for searching the web
 */
export const webSearchTool = tool({
  description:
    "Search the web for current information, news, or specific topics. Useful for fact-checking, finding current events, or retrieving information not in the training data.",
  inputSchema: z.object({
    query: z.string().describe("The search query to execute"),
    num_results: z
      .number()
      .optional()
      .default(5)
      .describe("Number of search results to return (default: 5)"),
  }),
  execute: async (args): Promise<ToolResult> => {
    try {
      // Using a simple search approach - in production, use a proper search API
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        args.query
      )}&format=json`;

      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `Search API returned ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: true,
        result: {
          query: args.query,
          abstract: data.Abstract || "",
          results: data.RelatedTopics?.slice(0, args.num_results).map(
            (t: { Text?: string; FirstURL?: string }) => ({
              title: t.Text?.split(" - ")[0] || "",
              snippet: t.Text || "",
              url: t.FirstURL || "",
            })
          ) || [],
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  },
});

export default webSearchTool;
