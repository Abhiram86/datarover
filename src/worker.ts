/// <reference lib="webworker" />

import type { MainToWorker } from "./types/pyodide";

let pyodide: any | null = null;
const pendingQueries: Record<number, any> = {};
let nextId = 1;

async function initPyodide() {
  if (pyodide) return;

  const { loadPyodide } =
    // @ts-expect-error CDN import
    await import("https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.mjs");

  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.2/full/",
  });

  pyodide.registerJsModule("duckdb", {
    async sql(query: string) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pendingQueries[id] = { resolve, reject };
        self.postMessage({
          type: "DUCKDB_QUERY",
          id,
          query,
        });
      });
    },
  });

  await pyodide.loadPackage([
    "pandas",
    "scipy",
    "scikit-learn",
    "numpy",
    "matplotlib",
  ]);
  await pyodide.runPythonAsync(`
    import json
    import asyncio
    import numpy as np
    import pandas as pd
    from duckdb import sql
    
    globals()["np"] = np
    globals()["pd"] = pd
    globals()["sql"] = sql
  `);

  // ✅ Proper stdout redirection
  pyodide.setStdout({
    batched: (msg: string) => {
      self.postMessage({
        type: "STDOUT",
        data: msg,
      });
    },
  });

  pyodide.setStderr({
    batched: (msg: string) => {
      self.postMessage({
        type: "STDERR",
        data: msg,
      });
    },
  });

  self.postMessage({ type: "PYODIDE_READY" });
}

self.onmessage = async (event: MessageEvent<MainToWorker>) => {
  const message = event.data;

  switch (message.type) {
    case "INIT":
      await initPyodide();
      break;

    case "EXEC": {
      const { id, code } = message;

      if (!pyodide) {
        self.postMessage({
          type: "EXEC_ERROR",
          id,
          error: "Pyodide not ready",
        });
        return;
      }

      try {
        const result = await pyodide.runPythonAsync(code);

        let finalResult = result;
        if (result && typeof result === "object" && "toJs" in result) {
          finalResult = result.toJs({ dict_converter: Object.fromEntries });
          result.destroy();
        }

        self.postMessage({
          type: "EXEC_RESULT",
          id,
          result: finalResult,
        });
      } catch (err) {
        self.postMessage({
          type: "EXEC_ERROR",
          id,
          error: String(err),
        });
      }

      break;
    }

    case "DUCKDB_RESULT": {
      const { id, result } = message;
      const json = JSON.stringify(result);
      pendingQueries[id]?.resolve(json);
      delete pendingQueries[id];
      break;
    }
    case "DUCKDB_ERROR": {
      const { id, error } = message;
      pendingQueries[id]?.reject(error);
      delete pendingQueries[id];
      break;
    }
  }
};
