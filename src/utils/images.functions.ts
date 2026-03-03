import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getImageUploadPermission } from "./images.server";
import { getCurrentUserFromCookie } from "./jwt.server";
import type { ImageUploadResult } from "@/types/image";

const getImageUploadUrlSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  extension: z.string().regex(/^[a-zA-Z0-9]+$/, "Invalid file extension").optional(),
});

export const getImageUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(getImageUploadUrlSchema)
  .handler(async ({ data }): Promise<ImageUploadResult> => {
    try {
      const user = getCurrentUserFromCookie();
      if (!user) {
        return {
          success: false,
          error: { message: "Unauthorized" },
        };
      }

      const workspace = await db
        .select({ user_id: workspacesTable.user_id })
        .from(workspacesTable)
        .where(eq(workspacesTable.id, data.workspaceId));

      if (!workspace.length || workspace[0].user_id !== user.userId) {
        return {
          success: false,
          error: { message: "Workspace not found or access denied" },
        };
      }

      const permission = await getImageUploadPermission({
        workspaceId: data.workspaceId,
        extension: data.extension,
      });

      if (!permission) {
        return {
          success: false,
          error: { message: "Failed to generate upload URL" },
        };
      }

      return {
        success: true,
        data: permission,
      };
    } catch (error) {
      console.error("[SERVER ERROR] getImageUploadUrl failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        workspaceId: data.workspaceId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to get upload URL",
        },
      };
    }
  });
