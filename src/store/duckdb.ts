import { create } from "zustand";

function normalizeRow(row: Record<string, any>) {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      out[key] = Number(value);
    } else {
      out[key] = value;
    }
  }

  return out;
}

type AsyncDuckDB = any;
type AsyncDuckDBConnection = any;

type MutationCallback = () => void | Promise<void>;

interface DuckDBState {
  db: AsyncDuckDB | null;
  conn: AsyncDuckDBConnection | null;
  isInitialized: boolean;
  isLoading: boolean;
  rowCount: number;
  columnNames: string[];
  mutationCallback: MutationCallback | null;
  initialize: () => Promise<void>;
  loadParquet: (buffer: Uint8Array, tableName?: string) => Promise<void>;
  query: (sql: string) => Promise<{ ok: boolean; result: any[]; error?: any }>;
  triggerMutationCallback: () => Promise<void>;
  setMutationCallback: (callback: MutationCallback | null) => void;
  getPreviewRows: (limit?: number) => Promise<any[]>;
  refreshSchema: (tableName?: string) => Promise<void>;
  close: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  db: null,
  conn: null,
  isInitialized: false,
  isLoading: false,
  rowCount: 0,
  columnNames: [],
  mutationCallback: null,
};

export const useDuckDBStore = create<DuckDBState>((set, get) => ({
  ...initialState,

  initialize: async () => {
    if (get().isInitialized || get().isLoading) return;
    set({ isLoading: true });

    try {
      if (typeof window === "undefined") {
        throw new Error("DuckDB can only be initialized in the browser");
      }

      const [duckdb_wasm, mvp_worker, duckdb_wasm_eh, eh_worker] =
        await Promise.all([
          import("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"),
          import("@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"),
          import("@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url"),
          import("@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url"),
        ]);

      const bundles = {
        mvp: {
          mainModule: duckdb_wasm.default ?? duckdb_wasm,
          mainWorker: mvp_worker.default ?? mvp_worker,
        },
        eh: {
          mainModule: duckdb_wasm_eh.default ?? duckdb_wasm_eh,
          mainWorker: eh_worker.default ?? eh_worker,
        },
      };

      const duckdb = await import("@duckdb/duckdb-wasm");
      const bundle = await duckdb.selectBundle(bundles);
      if (!bundle.mainWorker) {
        throw new Error("No worker found");
      }

      const worker = new Worker(bundle.mainWorker);
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);

      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      const conn = await db.connect();

      set({ db, conn, isInitialized: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  loadParquet: async (buffer: Uint8Array, tableName = "data") => {
    const { db, conn } = get();
    if (!db || !conn) throw new Error("DuckDB not initialized");

    await db.registerFileBuffer(`${tableName}.parquet`, buffer);

    await conn.query(
      `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${tableName}.parquet')`,
    );

    const countResult = await conn.query(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );
    const count = countResult.toArray()[0].count;

    const schemaResult = await conn.query(`DESCRIBE ${tableName}`);
    const columns = schemaResult.toArray().map((row: any) => row.column_name);

    set({ rowCount: count, columnNames: columns });
  },

  query: async (sql: string) => {
    const { conn } = get();
    if (!conn) throw new Error("DuckDB not initialized");

    try {
      const result = await conn.query(sql);
      return {
        ok: true,
        result: result.toArray().map(normalizeRow),
        error: null,
      };
    } catch (error) {
      console.error("Query error:", error);
      return {
        ok: false,
        result: [],
        error: error instanceof Error ? error.message : "Query failed",
      };
    }
  },

  triggerMutationCallback: async () => {
    const { mutationCallback } = get();
    if (mutationCallback) {
      try {
        await mutationCallback();
      } catch (error) {
        console.error("Mutation callback error:", error);
      }
    }
  },

  setMutationCallback: (callback: MutationCallback | null) => {
    set({ mutationCallback: callback });
  },

  refreshSchema: async (tableName = "data") => {
    const { conn } = get();
    if (!conn) throw new Error("DuckDB not initialized");

    const countResult = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = countResult.toArray()[0].count;

    const schemaResult = await conn.query(`DESCRIBE ${tableName}`);
    const columns = schemaResult.toArray().map((row: any) => row.column_name);

    set({ rowCount: count, columnNames: columns });
  },

  getPreviewRows: async (limit = 2000) => {
    const { conn } = get();

    if (!conn) throw new Error("DuckDB not initialized");

    const result = await conn.query(`
    SELECT * FROM data
    LIMIT ${limit}
  `);

    return result.toArray().map(normalizeRow);
  },

  close: async () => {
    const { conn, db } = get();
    await conn?.close();
    await db?.terminate();
    set({ db: null, conn: null, isInitialized: false });
  },

  reset: () => {
    set({ ...initialState });
  },
}));
