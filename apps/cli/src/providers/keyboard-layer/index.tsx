import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

type Responder = (key: KeyEvent) => boolean;
type Layer = { id: string; responder: Responder };

type KeyboardLayerValue = {
  push: (id: string, responder: Responder) => void;
  pop: (id: string) => void;
  isTopLayer: (id: string) => boolean;
  currentLayerId: string | null;
};

const KeyboardLayerContext = createContext<KeyboardLayerValue | null>(null);

export function KeyboardLayerProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Layer[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const renderer = useRenderer();

  const push = useCallback((id: string, responder: Responder) => {
    setStack((prev) =>
      prev.some((l) => l.id === id) ? prev : [...prev, { id, responder }],
    );
  }, []);

  const pop = useCallback(
    (id: string) => setStack((prev) => prev.filter((l) => l.id !== id)),
    [],
  );

  const isTopLayer = useCallback(
    (id: string) => stack.length > 0 && stack[stack.length - 1]?.id === id,
    [stack],
  );

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      for (let i = stackRef.current.length - 1; i >= 0; i--) {
        if (stackRef.current[i]?.responder(key)) return true;
      }
      renderer.destroy();
      return true;
    }
    return false;
  });

  const value = {
    push,
    pop,
    isTopLayer,
    currentLayerId:
      stack.length > 0 ? (stack[stack.length - 1]?.id ?? null) : null,
  };
  return (
    <KeyboardLayerContext.Provider value={value}>
      {children}
    </KeyboardLayerContext.Provider>
  );
}

export function useKeyboardLayer(): KeyboardLayerValue {
  const ctx = useContext(KeyboardLayerContext);
  if (!ctx)
    throw new Error(
      "useKeyboardLayer must be used within a KeyboardLayerProvider",
    );
  return ctx;
}
