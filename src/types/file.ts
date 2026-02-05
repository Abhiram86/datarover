export type FileType = "csv" | "excel" | "parquet" | {};

export type PreviewRow = Record<string, any>;

export interface FilePreview {
  fileName: string;
  fileType: FileType;
  columns: string[];
  rows: PreviewRow[];
  totalPreviewRows: number;
}

export interface ParsedPreview {
  fileName: string;
  fileType: FileType;
  columns: string[];
  rows: PreviewRow[];
  totalPreviewRows: number;
}

export interface UploadPermission {
  workspaceId: string | null;
  permission: boolean;
  data: {
    path: string;
    signedUrl: string;
    token: string;
  } | null;
  error: string | null;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    perms: UploadPermission;
    preview: FilePreview;
  };
  error?: {
    message: string;
  };
}

export interface WriteFileData {
  id: string;
  name: string;
  user_id: string;
  file_type: string;
}

export interface WriteFileResult {
  success: boolean;
  data: null;
  error?: {
    message: string;
  };
}
