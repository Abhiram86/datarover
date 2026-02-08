import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

/**
 * Tool for fetching content from a URL
 */
export const webFetchTool = tool({
  description:
    "Fetch and extract content from a specific URL. Useful for reading articles, documentation, or any web page content.",
  inputSchema: z.object({
    url: z.string().describe("The URL to fetch content from"),
    format: z
      .enum(["markdown", "text", "html"])
      .optional()
      .default("markdown")
      .describe("Output format: markdown, text, or html"),
  }),
  execute: async (args): Promise<ToolResult> => {
    try {
      const response = await fetch(args.url, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch?.[1]?.trim() || "";

      // Simple HTML to text conversion
      let content: string;

      switch (args.format) {
        case "html":
          content = html;
          break;
        case "text":
          content = htmlToText(html);
          break;
        case "markdown":
        default:
          content = htmlToMarkdown(html);
          break;
      }

      return {
        ok: true,
        result: {
          url: args.url,
          title,
          content: content.slice(0, 15000), // Limit content size
          format: args.format,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fetch URL",
      };
    }
  },
});

/**
 * Simple HTML to plain text conversion
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple HTML to Markdown conversion
 */
function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<h1[^>]*>([^<]*)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([^<]*)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([^<]*)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>([^<]*)<\/h4>/gi, "#### $1\n\n")
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([^<]*)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([^<]*)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([^<]*)<\/i>/gi, "*$1*")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  return md;
}

export default webFetchTool;
