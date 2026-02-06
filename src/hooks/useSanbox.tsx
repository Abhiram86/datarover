import { useSandboxStore } from "@/store/sandbox";
import { useEffect } from "react";

export const useSandbox = () => {
  const { init, runPython, ready } = useSandboxStore();

  useEffect(() => {
    init();
  }, []);

  const safePythonExec = async (code: string) => {
    if (!ready) {
      throw new Error("Sandbox not ready");
    }
    return await runPython(code);
  };

  return { safePythonExec, ready };
};
