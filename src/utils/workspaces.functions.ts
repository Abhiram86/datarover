import { createServerFn } from "@tanstack/react-start";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase } from "./supabase.server";
import { getCurrentUserFromCookie } from "./jwt.server";

const storage = supabase.storage.from("datafiles");

export const getWorkspaces = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const user = getCurrentUserFromCookie();
      if (!user) {
        return {
          success: false,
          error: { message: "Unauthorized" },
        };
      }

      const workspaces = await db
        .select({
          id: workspacesTable.id,
          name: workspacesTable.name,
          lastModified: workspacesTable.updated_at,
        })
        .from(workspacesTable)
        .where(eq(workspacesTable.user_id, user.userId));

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
      const user = getCurrentUserFromCookie();
      if (!user) {
        return {
          success: false,
          error: { message: "Unauthorized" },
        };
      }

      const workspace = await db
        .select({
          id: workspacesTable.id,
          name: workspacesTable.name,
          fileType: workspacesTable.file_type,
          lastModified: workspacesTable.updated_at,
        })
        .from(workspacesTable)
        .where(eq(workspacesTable.id, data.id!));

      if (workspace.length === 0) {
        return {
          success: false,
          error: { message: "Workspace not found" },
        };
      }

      return {
        success: true,
        data: {
          workspace: workspace[0],
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

export const getWorkspacePreview = createServerFn({ method: "POST" })
  .inputValidator((id) => {
    if (typeof id !== "string") {
      throw new Error("Invalid id type");
    }
    return id;
  })
  .handler(async ({ data }) => {
    try {
      const file = await storage.createSignedUrl(`data/${data}`, 60 * 5);
      if (file.error) {
        console.error(file.error);
        return {
          success: false,
          error: file.error.message,
        };
      }
      return {
        success: true,
        data: file.data.signedUrl,
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
        .where(eq(workspacesTable.id, data.id!))
        .limit(1);

      if (workspace.length === 0) {
        return {
          success: false,
          error: { message: "Workspace not found" },
        };
      }

      if (workspace[0].user_id !== user.userId) {
        return {
          success: false,
          error: { message: "Unauthorized" },
        };
      }

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

export const createWorkspace = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; fileType: string }) => {
    if (!data.name || typeof data.name !== "string") {
      return { success: false, error: "Invalid workspace name" };
    }
    if (!data.fileType || typeof data.fileType !== "string") {
      return { success: false, error: "Invalid file type" };
    }
    return { success: true, data };
  })
  .handler(async ({ data }) => {
    if (!data.success) {
      return {
        success: false,
        error: { message: data.error },
      };
    }

    try {
      const user = getCurrentUserFromCookie();
      if (!user) {
        return {
          success: false,
          error: { message: "Unauthorized" },
        };
      }

      const [newWorkspace] = await db
        .insert(workspacesTable)
        .values({
          name: data.data!.name,
          file_type: data.data!.fileType,
          user_id: user.userId,
        })
        .returning({
          id: workspacesTable.id,
          name: workspacesTable.name,
          fileType: workspacesTable.file_type,
          lastModified: workspacesTable.updated_at,
        });

      return {
        success: true,
        data: newWorkspace,
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
