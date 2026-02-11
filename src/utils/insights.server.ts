import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db.server";
import { agentInsightsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const insightSchema = z.object({
  id: z.number(),
  type: z.enum(["important", "general", "user_goals"]),
  context: z.string(),
  source: z.string().optional(),
});

const insightsDataSchema = z.object({
  important: z.array(insightSchema),
  general: z.array(insightSchema),
  user_goals: z.array(insightSchema),
});

const syncInsightsSchema = z.object({
  workspace_id: z.string(),
  insights: insightsDataSchema,
});

/**
 * Sync insights to database after agent loop completion
 */
export const syncInsightsToDB = createServerFn({ method: "POST" })
  .inputValidator((data) => syncInsightsSchema.safeParse(data))
  .handler(async ({ data }) => {
    if (!data.success) {
      return {
        success: false as const,
        error: "Invalid insights data: " + data.error.message,
      };
    }

    try {
      const { workspace_id, insights } = data.data;

      // Delete existing insights for this workspace
      await db
        .delete(agentInsightsTable)
        .where(eq(agentInsightsTable.workspace_id, workspace_id));

      // Insert new insights
      const values: typeof agentInsightsTable.$inferInsert = {
        workspace_id,
        content: {
          insights: {
            important: insights.important.map((i) => ({
              id: i.id,
              context: i.context,
              source: i.source,
            })),
            general: insights.general.map((i) => ({
              id: i.id,
              context: i.context,
              source: i.source,
            })),
            user_goals: insights.user_goals.map((i) => ({
              id: i.id,
              context: i.context,
              source: i.source,
            })),
          },
        },
      };
      await db.insert(agentInsightsTable).values(values);

      return {
        success: true as const,
      };
    } catch (error) {
      console.error("[Sync Insights] Error:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to sync insights",
      };
    }
  });

/**
 * Load insights from database for a workspace
 */
export const loadInsightsFromDB = createServerFn({ method: "GET" })
  .inputValidator((id: unknown) => {
    if (typeof id !== "string") throw new Error("Invalid workspace ID");
    return id;
  })
  .handler(async ({ data }) => {
    try {
      const [insights] = await db
        .select()
        .from(agentInsightsTable)
        .where(eq(agentInsightsTable.workspace_id, data));

      if (!insights) {
        return {
          success: true as const,
          data: null,
        };
      }

      return {
        success: true as const,
        data: insights.content,
      };
    } catch (error) {
      console.error("[Load Insights] Error:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to load insights",
      };
    }
  });
