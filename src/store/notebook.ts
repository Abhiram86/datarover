import { create } from "zustand";

export interface CodeBlock {
  id: string;
  code: string;
  output: string;
  outputType: "text" | "image" | "error";
  images?: string[];
  timestamp: number;
}

interface NotebookStore {
  blocks: CodeBlock[];
  maxBlocks: number;
  addBlock: (
    code: string,
    output: string,
    outputType: "text" | "image" | "error",
    images?: string[],
  ) => void;
  deleteBlock: (id: string) => void;
  getHead: (n: number) => CodeBlock[];
  getTail: (n: number) => CodeBlock[];
  getBlock: (id: string) => CodeBlock | undefined;
  loadNotebook: (workspaceId: string) => void;
  saveNotebook: (workspaceId: string) => void;
  clear: () => void;
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  blocks: [],
  maxBlocks: 50,

  addBlock: (code, output, outputType, images) => {
    const newBlock: CodeBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code,
      output,
      outputType,
      images,
      timestamp: Date.now(),
    };

    set((state) => {
      const newBlocks = [...state.blocks, newBlock];
      if (newBlocks.length > state.maxBlocks) {
        newBlocks.shift();
      }
      return { blocks: newBlocks };
    });
  },

  getHead: (n) => {
    const { blocks } = get();
    return blocks.slice(0, n);
  },

  getTail: (n) => {
    const { blocks } = get();
    return blocks.slice(-n);
  },

  getBlock: (id) => {
    const { blocks } = get();
    return blocks.find((b) => b.id === id);
  },

  deleteBlock: (id) => {
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
    }));
  },

  loadNotebook: (workspaceId) => {
    const notebook = localStorage.getItem(`notebook_${workspaceId}`);
    if (notebook) {
      set({ blocks: JSON.parse(notebook) ?? [] });
    }
  },

  saveNotebook: (workspaceId) => {
    localStorage.setItem(
      `notebook_${workspaceId}`,
      JSON.stringify(get().blocks),
    );
  },

  clear: () => {
    set({ blocks: [] });
  },
}));
