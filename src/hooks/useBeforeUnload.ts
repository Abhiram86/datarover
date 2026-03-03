import { useEffect, useRef } from "react";

export function useBeforeUnload(cb: (event: BeforeUnloadEvent) => void) {
  const cbRef = useRef(cb);

  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      cbRef.current(event);
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);
}
