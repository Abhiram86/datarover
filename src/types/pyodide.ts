export type WorkerToMain =
  | { type: "PYODIDE_READY" }
  | { type: "EXEC_RESULT"; id: number; result: unknown; images: string[] }
  | { type: "EXEC_ERROR"; id: number; error: string }
  | { type: "DUCKDB_QUERY"; id: number; query: string }
  | { type: "STDOUT"; data: string }
  | { type: "STDERR"; data: string }
  | { type: "PACKAGES_LOADED" }
  | { type: "PACKAGES_ERROR"; error: string };

export type MainToWorker =
  | { type: "INIT" }
  | { type: "EXEC"; id: number; code: string }
  | { type: "DUCKDB_RESULT"; id: number; result: unknown }
  | { type: "DUCKDB_ERROR"; id: number; error: string }
  | { type: "LOAD_PACKAGES"; packages: string[] };
