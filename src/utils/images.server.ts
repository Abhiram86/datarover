import { supabase } from "./supabase.server";
import type { ImageUploadPermission } from "@/types/image";

const plotsStorage = supabase.storage.from("plots");

interface GetImageUploadPermissionParams {
  workspaceId: string;
  extension?: string;
}

export async function getImageUploadPermission({
  workspaceId,
  extension = "png",
}: GetImageUploadPermissionParams): Promise<ImageUploadPermission | null> {
  try {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomSuffix}.${extension}`;
    const path = `${workspaceId}/${fileName}`;

    const { data, error } = await plotsStorage.createSignedUploadUrl(path);

    if (error || !data) {
      console.error("[SERVER ERROR] Failed to create signed upload URL:", error);
      return null;
    }

    // Generate public URL for reading (plots bucket is public)
    const {
      data: { publicUrl },
    } = plotsStorage.getPublicUrl(path);

    return {
      path: data.path,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl,
    };
  } catch (error) {
    console.error("[SERVER ERROR] Unexpected error in getImageUploadPermission:", {
      error: error instanceof Error ? error.message : "Unknown error",
      workspaceId,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
