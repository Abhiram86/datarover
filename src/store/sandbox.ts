import { create } from "zustand";
import type { WorkerToMain, MainToWorker } from "../types/pyodide";
import PyodideWorker from "../worker.ts?worker";
import { useDuckDBStore } from "./duckdb";

interface Pending {
  resolve: (value: { result: unknown; images: string[] }) => void;
  reject: (error: unknown) => void;
  cancelled: boolean;
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
  runPython: (code: string) => Promise<{ result: unknown; images: string[] }>;
  runPythonSafe: (code: string, timeout?: number) => Promise<{
    ok: boolean;
    result?: unknown;
    images?: string[];
    error?: unknown;
    consoleOutput?: string[];
  }>;
  runPythonWithTimeout: (
    code: string,
    timeout?: number,
  ) => Promise<{ result: unknown; images: string[] }>;
  loadPackage: (pkg: string) => Promise<unknown>;
  reset: () => void;
  runPythonWithRetry: (
    code: string,
    waitForSandbox: () => Promise<void>,
    timeout?: number
  ) => Promise<{
    ok: boolean;
    result?: unknown;
    images?: string[];
    error?: unknown;
    consoleOutput?: string[];
  }>;
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

    worker.onmessage = async (e: MessageEvent<WorkerToMain>) => {
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

      if (msg.type === "DUCKDB_QUERY") {
        try {
          const result = await useDuckDBStore.getState().query(msg.query);
          worker.postMessage({
            type: "DUCKDB_RESULT",
            id: msg.id,
            result,
          });
        } catch (error) {
          console.error("DuckDB query error:", error);
          worker.postMessage({
            type: "DUCKDB_ERROR",
            id: msg.id,
            error: error instanceof Error ? error.message : "Query failed",
          });
        }
      }

      if (msg.type === "EXEC_ERROR" && msg.id === -1) {
        console.error("Worker init failed:", msg.error);
        return;
      }

      // Handle package loading messages
      if (msg.type === "PACKAGES_LOADED" || msg.type === "PACKAGES_ERROR") {
        // These are handled by whoever initiated the load
        return;
      }

      // Handle EXEC_RESULT and EXEC_ERROR
      if (msg.type === "EXEC_RESULT" || msg.type === "EXEC_ERROR") {
        const entry = get().pending[msg.id];
        if (!entry || entry.cancelled) {
          // Clean up cancelled entry and reject promise to prevent memory leak
          if (entry?.cancelled) {
            entry.reject(new Error("Query cancelled"));
            set((state) => {
              const { [msg.id]: _, ...rest } = state.pending;
              return { pending: rest };
            });
          }
          return;
        }

        if (msg.type === "EXEC_RESULT") {
          entry.resolve({ result: msg.result, images: msg.images });
        } else if (msg.type === "EXEC_ERROR") {
          entry.reject(new Error(msg.error));
        }

        set((state) => {
          const { [msg.id]: _, ...rest } = state.pending;
          return { pending: rest };
        });
      }
    };

    const initMsg: MainToWorker = { type: "INIT" };
    worker.postMessage(initMsg);

    set({ worker });
  },

  clearConsole: () => {
    set({ consoleOutput: [] });
  },

  runPython: (code: string): Promise<{ result: unknown; images: string[] }> => {
    if (!get().ready) {
      return Promise.reject(new Error("Pyodide not ready"));
    }

    const id = get().nextId;
    set({ nextId: id + 1 });

    return new Promise((resolve, reject) => {
      set((state) => ({
        pending: {
          ...state.pending,
          [id]: { resolve, reject, cancelled: false },
        },
      }));

      const msg: MainToWorker = { type: "EXEC", id, code };
      get().worker!.postMessage(msg);
    });
  },

  runPythonSafe: async (code: string, timeout = 60000) => {
    let executionId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      get().clearConsole();
      set({ running: true });

      // Track execution ID for potential cancellation
      const runPythonPromise = get().runPython(code);
      executionId = get().nextId - 1;

      // Use timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => {
            // Mark execution as cancelled to ignore late results
            if (executionId !== null) {
              set((state) => {
                const entry = state.pending[executionId!];
                if (entry) {
                  return {
                    pending: {
                      ...state.pending,
                      [executionId!]: { ...entry, cancelled: true },
                    },
                  };
                }
                return state;
              });
            }
            reject(
              new Error(
                "TIMEOUT: Execution timed out after 60 seconds. The code may be stuck in an infinite loop or taking too long to execute. Consider breaking down your code into smaller parts or optimizing your queries.",
              ),
            );
          },
          timeout,
        );
      });

      const { result, images } = await Promise.race([
        runPythonPromise,
        timeoutPromise,
      ]);

      // Clear timeout if execution completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return { ok: true, result, images, consoleOutput: get().consoleOutput };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const consoleOutput = get().consoleOutput;

      // Format error for AI recovery with actionable information
      let formattedError = errorMessage;

      // Check for common error patterns and add helpful suggestions
      if (errorMessage.includes("AttributeError")) {
        const attrMatch = errorMessage.match(
          /AttributeError: ['"]([^'"]+)['"]/,
        );
        if (attrMatch) {
          const attr = attrMatch[1];
          formattedError =
            `AttributeError: The object does not have the attribute '${attr}'. This often happens when:\n` +
            `- Data types are different than expected (e.g., dict vs string)\n` +
            `- You're trying to call a method that doesn't exist on the type\n` +
            `- SQL results are already parsed as dicts, not strings\n\n` +
            `Full error: ${errorMessage}\n\n` +
            `Console output:\n${consoleOutput.join("\n")}`;
        }
      } else if (errorMessage.includes("NameError")) {
        const nameMatch = errorMessage.match(
          /NameError: name '(\w+)' is not defined/,
        );
        if (nameMatch) {
          const name = nameMatch[1];
          formattedError =
            `NameError: '${name}' is not defined. This often happens when:\n` +
            `- You misspelled a variable or function name\n` +
            `- You need to import the module first\n` +
            `- The variable hasn't been assigned yet\n\n` +
            `Full error: ${errorMessage}\n\n` +
            `Console output:\n${consoleOutput.join("\n")}`;
        }
      } else if (errorMessage.includes("TypeError")) {
        formattedError =
          `TypeError: A type mismatch occurred. This often happens when:\n` +
          `- You're trying to call a method on the wrong type\n` +
          `- You're using the wrong number of arguments\n` +
          `- You're concatenating incompatible types\n\n` +
          `Full error: ${errorMessage}\n\n` +
          `Console output:\n${consoleOutput.join("\n")}`;
      } else if (errorMessage.includes("TIMEOUT")) {
        formattedError =
          `Timeout Error: ${errorMessage}\n\n` +
          `What you can try:\n` +
          `- Break your code into smaller chunks\n` +
          `- Add LIMIT clauses to your SQL queries\n` +
          `- Check for infinite loops\n` +
          `- Simplify your visualization code\n\n` +
          `Console output:\n${consoleOutput.join("\n")}`;
      } else {
        // Generic format with console output for debugging
        formattedError =
          `Error: ${errorMessage}\n\n` +
          `Debug info (console output):\n${consoleOutput.join("\n")}\n\n` +
          `Tip: Check the error message above and traceback to understand what went wrong.`;
      }

      console.error("[sandbox] Python execution error:", formattedError);
      return { ok: false, error: formattedError, images: [], consoleOutput };
    } finally {
      // Clear timeout to prevent memory leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      set({ running: false });
    }
  },

  runPythonWithTimeout: (
    code: string,
    timeout = 5000,
  ): Promise<{ result: unknown; images: string[] }> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return Promise.race([
      get().runPython(code).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Execution timed out")),
          timeout
        );
      }).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      }),
    ]);
  },

  loadPackage: (pkg: string) => {
    return get().runPython(`
import micropip
await micropip.install("${pkg}")
  `);
  },

  runPythonWithRetry: async (
    code: string,
    waitForSandbox: () => Promise<void>,
    timeout = 60000
  ): Promise<{
    ok: boolean;
    result?: unknown;
    images?: string[];
    error?: unknown;
    consoleOutput?: string[];
  }> => {
    try {
      // Wait for sandbox to be ready (with retry logic)
      await waitForSandbox();

      // Now run the code normally
      return await get().runPythonSafe(code, timeout);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle special error types from retry logic
      if (errorMessage === "DISMISSED_BY_USER") {
        return {
          ok: false,
          error: "SANDBOX_DISMISSED",
          images: [],
          consoleOutput: [],
        };
      }
      
      if (errorMessage === "MAX_RETRIES_REACHED") {
        return {
          ok: false,
          error: "SANDBOX_MAX_RETRIES",
          images: [],
          consoleOutput: [],
        };
      }
      
      // Re-throw other errors
      throw error;
    }
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
