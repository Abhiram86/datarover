/// <reference lib="webworker" />

import type { MainToWorker } from "./types/pyodide";

let pyodide: any | null = null;

async function initPyodide() {
  if (pyodide) return;

  const { loadPyodide } =
    // @ts-expect-error CDN import
    await import("https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.mjs");

  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.2/full/",
  });

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
  }
};
