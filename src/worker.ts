/// <reference lib="webworker" />

import type { MainToWorker, WorkerToMain } from "./types/pyodide";

let pyodide: any | null = null;

async function initPyodide() {
  if (pyodide) return;

  const { loadPyodide } =
    // @ts-expect-error its cdn import
    await import("https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.mjs");

  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.2/full/",
  });

  const msg: WorkerToMain = { type: "PYODIDE_READY" };
  self.postMessage(msg);
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
        self.postMessage({ type: "EXEC_RESULT", id, result });
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
