import { tool } from "ai";
import { z } from "zod";
import type { ToolResult } from "./index";

const readCodeSchema = z
  .object({
    head: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Number of oldest code blocks to read (from the beginning)"),
    tail: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Number of most recent code blocks to read (from the end)"),
    blockId: z
      .string()
      .optional()
      .describe("Specific block ID to retrieve"),
  })
  .superRefine((data, ctx) => {
    const hasHead = data.head !== undefined;
    const hasTail = data.tail !== undefined;
    const hasBlockId = data.blockId !== undefined;

    const count = [hasHead, hasTail, hasBlockId].filter(Boolean).length;

    if (count === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "You must specify at least one of: head, tail, or blockId",
        path: [],
      });
    }

    if (count > 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Only one of head, tail, or blockId can be specified at a time",
        path: [],
      });
    }
  });

export type ReadCodeInput = z.infer<typeof readCodeSchema>;

export const readCodeTool = tool({
  description:
    "Read previous code blocks and their outputs from the notebook session. Use head:n for oldest n blocks, tail:n for most recent n blocks, or blockId to get a specific block. Returns code and output for each block.",
  inputSchema: readCodeSchema,
  execute: async (): Promise<ToolResult> => {
    return {
      ok: true,
      result: "read_code execution handled client-side",
    };
  },
});

export default readCodeTool;
