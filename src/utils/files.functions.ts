import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseDataFromFile, uploadToSupabase } from "./files.server";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromCookie } from "./jwt.server";

const fileSchema = z
  .instanceof(FormData)
  .refine((data) => data.has("file"), { error: "No file found" });

export const uploadFile = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    const parsed = fileSchema.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.message);
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("No file found");
    console.log("name: ", file.name);

    try {
      const user = getCurrentUserFromCookie();
      if (!user) {
        return {
          success: false,
          data: null,
          error: { message: "Unauthorized" },
        };
      }

      const perms = await uploadToSupabase({
        fileName: file.name,
        fileType: file.type,
        userId: user.userId,
      });

      if (!perms.permission) {
        return {
          success: false,
          data: null,
          error: { message: "Failed to upload file to Supabase" },
        };
      }

      const uploaded = await parseDataFromFile(file);

      return {
        success: true,
        data: {
          perms,
          preview: uploaded,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? { message: err.message }
            : { message: "Unknown error" },
      };
    }
  });

const writeFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  user_id: z.string(),
  file_type: z.string(),
});

export const writeFileToDB = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    const parsed = writeFileSchema.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.message);
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const { id, name, user_id, file_type } = data;
    try {
      await db
        .update(workspacesTable)
        .set({
          name,
          user_id,
          file_type,
        })
        .where(eq(workspacesTable.id, id));
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
