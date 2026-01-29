import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseDataFromFile } from "./files.server";

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

    const uploaded = await parseDataFromFile(file);

    return { success: true, data: uploaded };
  });
