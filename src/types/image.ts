export interface ImageUploadState {
  tempId: string;
  base64Url: string;
  publicUrl?: string;
}

export interface ImageUploadPermission {
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
}

export interface ImageUploadResult {
  success: boolean;
  data?: ImageUploadPermission;
  error?: {
    message: string;
  };
}

