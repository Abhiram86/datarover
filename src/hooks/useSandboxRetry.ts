import { useCallback, useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";

interface SandboxRetryState {
  attempt: number;
  countdown: number;
  isWaiting: boolean;
}

interface SandboxRetryResult {
  attempt: number;
  countdown: number;
  isWaiting: boolean;
  dismiss: () => void;
  waitForSandbox: (isReady: () => boolean) => Promise<void>;
}

const MAX_RETRIES = 3;
const COUNTDOWN_SECONDS = 5;

export function useSandboxRetry(): SandboxRetryResult {
  // Cleanup interval on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const [state, setState] = useState<SandboxRetryState>({
    attempt: 0,
    countdown: 0,
    isWaiting: false,
  });

  const toastIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const isRejectedRef = useRef(false);

  // Clear UI state without rejecting the promise (used between retries)
  const clearUIState = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  // Full dismiss - clears UI and rejects promise (used for max retries or user cancel)
  const dismiss = useCallback(() => {
    clearUIState();
    rejectRef.current = null;
    isRejectedRef.current = true;
    setState({ attempt: 0, countdown: 0, isWaiting: false });
  }, [clearUIState]);

  const waitForSandbox = useCallback(
    (isReady: () => boolean): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Reset rejection state for new wait
        isRejectedRef.current = false;
        rejectRef.current = reject;

        // If already ready, resolve immediately
        if (isReady()) {
          resolve();
          return;
        }

        let currentAttempt = 0;

        const tryCheck = () => {
          // Check if already rejected (user dismissed)
          if (isRejectedRef.current) {
            return;
          }

          currentAttempt++;

          // Max retries reached
          if (currentAttempt > MAX_RETRIES) {
            reject(new Error("MAX_RETRIES_REACHED"));
            clearUIState();
            setState({ attempt: 0, countdown: 0, isWaiting: false });
            return;
          }

          // Start countdown
          let remaining = COUNTDOWN_SECONDS;
          setState({
            attempt: currentAttempt,
            countdown: remaining,
            isWaiting: true,
          });

          // Show toast with countdown
          const toastMessage = `Retry ${currentAttempt}/${MAX_RETRIES} for loading sandbox... ${remaining}s`;
          toastIdRef.current = toast.loading(toastMessage, {
            duration: Infinity,
          });

          // Countdown interval
          countdownIntervalRef.current = setInterval(() => {
            remaining--;

            if (remaining >= 0) {
              // Update toast with new countdown
              setState((prev) => ({ ...prev, countdown: remaining }));
              if (toastIdRef.current) {
                toast.loading(
                  `Retry ${currentAttempt}/${MAX_RETRIES} for loading sandbox... ${remaining}s`,
                  { id: toastIdRef.current }
                );
              }
            }

            // Countdown reached 0, check if ready
            if (remaining <= 0) {
              // Clear interval first
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }

              // Check if sandbox is ready now
              if (isReady()) {
                clearUIState();
                setState({ attempt: 0, countdown: 0, isWaiting: false });
                resolve();
              } else {
                // Not ready, clear toast and try again (without rejecting)
                if (toastIdRef.current) {
                  toast.dismiss(toastIdRef.current);
                  toastIdRef.current = null;
                }
                tryCheck();
              }
            }
          }, 1000);
        };

        // Start first attempt
        tryCheck();
      });
    },
    [clearUIState]
  );

  return {
    attempt: state.attempt,
    countdown: state.countdown,
    isWaiting: state.isWaiting,
    dismiss,
    waitForSandbox,
  };
}
