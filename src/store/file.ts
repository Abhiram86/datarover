import { create } from "zustand";

export type FileType = "csv" | "excel" | "unknown";

export type PreviewRow = Record<string, any>;

export interface FilePreview {
  fileName: string;
  fileType: FileType;
  columns: string[];
  rows: PreviewRow[];
  totalPreviewRows: number;
}

interface FileStoreState {
  // data
  preview: FilePreview | null;

  // ui state
  isUploading: boolean;
  error: string | null;

  // actions
  setUploading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setPreview: (preview: FilePreview) => void;
  reset: () => void;
}

const initialState = {
  preview: null,
  isUploading: false,
  error: null,
};

export const useFileStore = create<FileStoreState>((set) => ({
  ...initialState,

  setUploading: (value) => set({ isUploading: value }),
  setError: (error) => set({ error }),
  setPreview: (preview) =>
    set({
      preview,
      error: null,
      isUploading: false,
    }),

  reset: () => set(initialState),
}));
