import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

/**
 * Tool for executing Python code in a browser-based Pyodide sandbox
 */
export const runPythonTool = tool({
  description:
    "Execute Python code in a browser-based sandbox using Pyodide. Supports pandas, numpy, and standard library. Use this for data analysis, transformations, and calculations.",
  inputSchema: z.object({
    code: z
      .string()
      .describe(
        "The Python code to execute. Can include imports, function definitions, and any valid Python code."
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Brief explanation of what the code does. Recommended for operations that modify data or create new variables. Optional for read-only operations (analysis, visualization).",
      ),
  }),
  execute: async (): Promise<ToolResult> => {
    // Note: Actual execution happens client-side via useChatStream hook
    // This is just a placeholder for type compatibility
    return {
      ok: true,
      result: "Python execution handled client-side",
    };
  },
});

export default runPythonTool;
