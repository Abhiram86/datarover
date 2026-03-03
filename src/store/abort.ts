import { create } from "zustand";

interface AbortStore {
  controller: AbortController | null;
  isAborted: boolean;
  createController: () => void;
  abort: () => void;
  reset: () => void;
}

export const useAbortStore = create<AbortStore>((set, get) => ({
  controller: null,
  isAborted: false,

  createController: () => {
    const controller = new AbortController();
    set({ controller, isAborted: false });
  },

  abort: () => {
    const { controller } = get();
    if (controller) {
      controller.abort();
      set({ isAborted: true });
    }
  },

  reset: () => {
    set({ controller: null, isAborted: false });
  },
}));
