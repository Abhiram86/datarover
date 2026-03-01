/// <reference lib="webworker" />

import type { MainToWorker } from "./types/pyodide";

let pyodide: any | null = null;
const pendingQueries: Record<number, any> = {};
let nextId = 1;

// Cleanup handler on worker termination
self.addEventListener('terminate', () => {
  // Reject all pending queries
  Object.entries(pendingQueries).forEach(([id, entry]) => {
    entry.reject(new Error('Worker terminated'));
    delete pendingQueries[Number(id)];
  });
  // Clear pyodide reference
  pyodide = null;
});

async function initPyodide() {
  if (pyodide) return;

  const { loadPyodide } =
    // @ts-ignore
    await import("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs");

  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  });

  // --- DuckDB bridge ---
  pyodide.registerJsModule("duckdb_bridge", {
    async sql(query: string) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pendingQueries[id] = { resolve, reject };
        self.postMessage({ type: "DUCKDB_QUERY", id, query });
      });
    },
  });

  // Load packages upfront using pyodide.loadPackage (not micropip)
  await pyodide.loadPackage([
    "numpy",
    "pandas",
    "scipy",
    "scikit-learn",
    "matplotlib",
  ]);

  // --- Python bootstrap ---
  await pyodide.runPythonAsync(`
import json
import io
import base64
import traceback
import sys
import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scipy
import sklearn
from duckdb_bridge import sql as _raw_sql

globals()["np"] = np
globals()["pd"] = pd
globals()["plt"] = plt

async def sql(query: str):
    try:
        res = await _raw_sql(query)
        return json.loads(res)["result"]
    except Exception as e:
        raise Exception(str(e))

def capture_all_plots():
    images = []
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        buf.seek(0)
        images.append(base64.b64encode(buf.read()).decode())
        plt.close(fig)
    return images
`);

  pyodide.setStdout({
    batched: (msg: string) => {
      self.postMessage({ type: "STDOUT", data: msg });
    },
  });

  pyodide.setStderr({
    batched: (msg: string) => {
      self.postMessage({ type: "STDERR", data: msg });
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
          error: "Pyodide not initialized",
        });
        return;
      }

      // Wrap user code inside an async function so top-level `await` inside user code works.
      // We run that async function at top-level via runPythonAsync, which supports top-level await.
      const pythonCode = `
import json, traceback
# user code will run inside this async wrapper
async def __user_wrapper():
${code
  .split("\n")
  .map((line) => "    " + line) // indent user code into the function body
  .join("\n")}

# Execute the async wrapper first, then capture plots
result = await __user_wrapper()
# After user's code runs, capture plots (capture_all_plots must be available in globals)
try:
    images = capture_all_plots()
    # Return structured JSON string to JS to avoid proxy/exception ambiguity
    printable = json.dumps({"ok": True, "images": images})
except Exception as e:
    printable = json.dumps({"ok": False, "error": traceback.format_exc()})

# Return the structured result
printable
`;

      try {
        // Execute pythonCode (runPythonAsync supports top-level await)
        const proxyOrValue = await pyodide.runPythonAsync(pythonCode);

        // Safely convert result (may already be JS string or a PyProxy)
        let resultStr: any;
        if (proxyOrValue && typeof proxyOrValue.toJs === "function") {
          resultStr = proxyOrValue.toJs();
          // Always destroy proxy to prevent memory leak
          proxyOrValue.destroy();
        } else {
          resultStr = proxyOrValue;
        }

        // resultStr should be a JSON string per our Python wrapper
        const parsed = JSON.parse(resultStr);

        if (!parsed.ok) {
          self.postMessage({
            type: "EXEC_ERROR",
            id,
            error: parsed.error,
          });
        } else {
          self.postMessage({
            type: "EXEC_RESULT",
            id,
            result: null,
            images: parsed.images || [],
          });
        }
      } catch (error) {
        // Any JS / Pyodide-level error (including timeouts) is sent back explicitly
        self.postMessage({
          type: "EXEC_ERROR",
          id,
          error: String(error),
        });
      }

      break;
    }

    case "DUCKDB_RESULT": {
      const { id, result } = message;
      pendingQueries[id]?.resolve(JSON.stringify(result));
      delete pendingQueries[id];
      break;
    }

    case "DUCKDB_ERROR": {
      const { id, error } = message;
      pendingQueries[id]?.reject(error);
      delete pendingQueries[id];
      break;
    }

    case "LOAD_PACKAGES": {
      const { packages } = message;
      try {
        // Lazy load packages via micropip
        await pyodide.runPythonAsync(`
import micropip
await micropip.install([${packages.map((p: string) => `"${p}"`).join(", ")}])
        `);
        self.postMessage({ type: "PACKAGES_LOADED" });
      } catch (error) {
        self.postMessage({
          type: "PACKAGES_ERROR",
          error: String(error),
        });
      }
      break;
    }
  }
};
