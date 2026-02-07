export type WorkerToMain =
  | { type: "PYODIDE_READY" }
  | { type: "EXEC_RESULT"; id: number; result: unknown }
  | { type: "EXEC_ERROR"; id: number; error: string }
  | { type: "STDOUT"; id: number; data: string }
  | { type: "STDERR"; id: number; data: string };

export type MainToWorker =
  | { type: "INIT" }
  | { type: "EXEC"; id: number; code: string };
