import { useCallback, useEffect, useRef } from "react";
import type { MainToUi, UiToMain } from "../../shared/messages";

// The only place that touches postMessage. Components call `send(...)` and
// `onMessage(...)` with full types and never see the plumbing.
export function usePluginBridge(handler: (msg: MainToUi) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as MainToUi | undefined;
      if (msg && typeof msg.type === "string") handlerRef.current(msg);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const send = useCallback((msg: UiToMain) => {
    parent.postMessage({ pluginMessage: msg }, "*");
  }, []);

  return { send };
}
