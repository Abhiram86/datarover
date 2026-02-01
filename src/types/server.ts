import type { FilePreview } from "./file";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Workspace {
  id: string;
  name: string | null;
  fileType: string | null;
  lastModified: Date | null;
}

export interface WorkspaceData {
  workspace: Workspace;
  preview: FilePreview;
}

export interface GetWorkspacesResult {
  success: boolean;
  data?: Workspace[];
  error?: {
    message: string;
  };
}

export interface GetWorkspaceResult {
  success: boolean;
  data?: WorkspaceData;
  error?: string;
}

export interface DeleteWorkspaceResult {
  success: boolean;
  data: null;
  error?: {
    message: string;
  };
}

export interface SupabaseEnvData {
  supabaseProjectUrl: string;
  supabaseAnonKey: string;
}

export interface SupabaseEnvResult {
  success: true;
  data: SupabaseEnvData;
}

export interface WorkspaceHeaderProps {
  supabase: SupabaseClient;
}
