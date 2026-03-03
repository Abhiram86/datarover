import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageUploadPermission } from "@/types/image";

/**
 * Converts a base64 string to a Blob
 */
export function base64ToBlob(base64: string, mimeType: string = "image/png"): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Uploads an image to Supabase storage using a signed URL
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToSignedUrl(
  supabase: SupabaseClient,
  permission: ImageUploadPermission,
  base64Image: string
): Promise<string> {
  const blob = base64ToBlob(base64Image);
  
  const { error } = await supabase.storage
    .from("plots")
    .uploadToSignedUrl(permission.path, permission.token, blob);

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return permission.publicUrl;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageWithRetry(
  supabase: SupabaseClient,
  permission: ImageUploadPermission,
  base64Url: string,
  maxRetries: number = 3
): Promise<UploadResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = await uploadImageToSignedUrl(supabase, permission, base64Url);
      return { success: true, url };
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: String(error) };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { success: false, error: "Max retries reached" };
}
