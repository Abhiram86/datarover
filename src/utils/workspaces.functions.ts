import { createServerFn } from "@tanstack/react-start";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase } from "./supabase.server";
import { parseCSVPreview, parseExcelPreview } from "./files.server";

const storage = supabase.storage.from("datafiles");

export const getWorkspaces = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const workspaces = await db
        .select({
          id: workspacesTable.id,
          name: workspacesTable.name,
          lastModified: workspacesTable.updated_at,
        })
        .from(workspacesTable)
        .where(
          eq(workspacesTable.user_id, "7ceb974a-e22d-4923-8398-aac2c0c10ec6"),
        );
      return {
        success: true,
        data: workspaces,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Unknown error" },
      };
    }
  },
);

export const getWorkspace = createServerFn({ method: "POST" })
  .inputValidator((id) => {
    if (typeof id !== "string") {
      return { success: false, error: "Invalid workspace ID" };
    }
    return { success: true, id: id };
  })
  .handler(async ({ data }) => {
    if (data.error) {
      console.error(data.error);
      return {
        success: false,
        error: data.error,
      };
    }
    try {
      const workspace = await db
        .select({
          id: workspacesTable.id,
          name: workspacesTable.name,
          fileType: workspacesTable.file_type,
          lastModified: workspacesTable.updated_at,
        })
        .from(workspacesTable)
        .where(eq(workspacesTable.id, data.id!));
      const { data: blob, error } = await storage.download(`data/${data.id}`);
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      const previewBlob = blob.slice(0, 2 * 1024 * 1024);
      const previewFile = new File([previewBlob], workspace[0].name!, {
        type: workspace[0].fileType!,
      });
      const preview =
        workspace[0].fileType === "csv"
          ? await parseCSVPreview(previewFile)
          : await parseExcelPreview(previewFile);
      return {
        success: true,
        data: {
          workspace: workspace[0],
          preview,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Unknown error" },
      };
    }
  });

export const deleteWorkspace = createServerFn({ method: "POST" })
  .inputValidator((id) => {
    if (typeof id !== "string") {
      return { success: false, error: "Invalid workspace ID" };
    }
    return { success: true, id: id };
  })
  .handler(async ({ data }) => {
    if (data.error) {
      console.error(data.error);
      return {
        success: false,
        error: data.error,
      };
    }
    try {
      await db.delete(workspacesTable).where(eq(workspacesTable.id, data.id!));

      await storage.remove([`data/${data.id}`]);

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Unknown error" },
      };
    }
  });
