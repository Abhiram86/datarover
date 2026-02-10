import type { ToolResult } from "./index";
import { useInsightsStore } from "@/store/insights";

/**
 * Read insights from workspace memory
 */
export async function readInsightsTool(args: {
  type?: "important" | "general" | "user_goals";
  limit?: number;
  id?: number;
}): Promise<ToolResult> {
  try {
    const { getInsights } = useInsightsStore.getState();
    const result = getInsights(args.type, args.limit, args.id);

    return {
      ok: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to read insights",
    };
  }
}

/**
 * Write or update an insight to workspace memory
 */
export async function writeInsightTool(args: {
  type: "important" | "general" | "user_goals";
  context: string;
  source?: string;
  id?: number;
}): Promise<ToolResult> {
  try {
    const { addInsight, updateInsight } = useInsightsStore.getState();

    if (args.id !== undefined) {
      // Update existing insight
      const success = updateInsight(args.type, args.id, {
        type: args.type,
        context: args.context,
        ...(args.source && { source: args.source }),
      });

      if (!success) {
        return {
          ok: false,
          error: `Insight with ID ${args.id} not found in ${args.type}`,
        };
      }

      return {
        ok: true,
        result: { id: args.id, updated: true },
      };
    } else {
      // Create new insight
      const newId = addInsight(args.type, args.context, args.source);

      return {
        ok: true,
        result: { id: newId, created: true },
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to write insight",
    };
  }
}

/**
 * Delete an insight from workspace memory
 */
export async function deleteInsightTool(args: {
  type: "important" | "general" | "user_goals";
  id: number;
}): Promise<ToolResult> {
  try {
    const { deleteInsight } = useInsightsStore.getState();
    const success = deleteInsight(args.type, args.id);

    if (!success) {
      return {
        ok: false,
        error: `Insight with ID ${args.id} not found in ${args.type}`,
      };
    }

    return {
      ok: true,
      result: { deleted: true },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete insight",
    };
  }
}

// Export for use in executeToolCall
export const insightTools = {
  read_insights: readInsightsTool,
  write_insight: writeInsightTool,
  delete_insight: deleteInsightTool,
};
