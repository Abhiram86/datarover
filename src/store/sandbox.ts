import { create } from "zustand";
import type { WorkerToMain, MainToWorker } from "../types/pyodide";
import PyodideWorker from "../worker.ts?worker";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

interface SandboxStore {
  worker: Worker | null;
  ready: boolean;
  nextId: number;
  pending: Record<number, Pending>;
  running: boolean;
  consoleOutput: string[];

  init: () => void;
  clearConsole: () => void;
  runPython: (code: string) => Promise<unknown>;
  runPythonSafe: (
    code: string,
  ) => Promise<{
    ok: boolean;
    result?: unknown;
    error?: unknown;
    consoleOutput?: string[];
  }>;
  runPythonWithTimeout: (code: string, timeout?: number) => Promise<unknown>;
  loadPackage: (pkg: string) => Promise<unknown>;
  reset: () => void;
}

export const useSandboxStore = create<SandboxStore>((set, get) => ({
  worker: null,
  ready: false,
  nextId: 1,
  running: false,
  consoleOutput: [],
  pending: {},

  init: () => {
    if (get().worker) return;

    const worker = new PyodideWorker();

    worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;

      if (msg.type === "STDOUT") {
        set((state) => ({
          consoleOutput: [...state.consoleOutput, msg.data],
        }));
        return;
      }

      if (msg.type === "STDERR") {
        set((state) => ({
          consoleOutput: [...state.consoleOutput, `[ERR] ${msg.data}`],
        }));
        return;
      }

      if (msg.type === "PYODIDE_READY") {
        set({ ready: true });
        return;
      }

      if (msg.type === "EXEC_ERROR" && msg.id === -1) {
        console.error("Worker init failed:", msg.error);
        return;
      }

      const entry = get().pending[msg.id];
      if (!entry) return;

      if (msg.type === "EXEC_RESULT") {
        entry.resolve(msg.result);
      } else if (msg.type === "EXEC_ERROR") {
        entry.reject(new Error(msg.error));
      }

      set((state) => {
        const { [msg.id]: _, ...rest } = state.pending;
        return { pending: rest };
      });
    };

    const initMsg: MainToWorker = { type: "INIT" };
    worker.postMessage(initMsg);

    set({ worker });
  },

  clearConsole: () => {
    set({ consoleOutput: [] });
  },

  runPython: (code: string) => {
    if (!get().ready) {
      return Promise.reject(new Error("Pyodide not ready"));
    }

    const id = get().nextId;
    set({ nextId: id + 1 });

    return new Promise((resolve, reject) => {
      set((state) => ({
        pending: {
          ...state.pending,
          [id]: { resolve, reject },
        },
      }));

      const msg: MainToWorker = { type: "EXEC", id, code };
      get().worker!.postMessage(msg);
    });
  },

  runPythonSafe: async (code: string) => {
    try {
      get().clearConsole();
      set({ running: true });
      const result = await get().runPython(code);
      return { ok: true, result, consoleOutput: get().consoleOutput };
    } catch (error) {
      return { ok: false, error, consoleOutput: get().consoleOutput };
    } finally {
      set({ running: false });
    }
  },

  runPythonWithTimeout: (code: string, timeout = 5000) => {
    return Promise.race([
      get().runPython(code),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Execution timed out")), timeout),
      ),
    ]);
  },

  loadPackage: (pkg: string) => {
    return get().runPython(`
import micropip
await micropip.install("${pkg}")
  `);
  },

  reset: () => {
    get().worker?.terminate();
    set({
      worker: null,
      ready: false,
      nextId: 1,
      consoleOutput: [],
      pending: {},
    });
    get().init();
  },
}));
