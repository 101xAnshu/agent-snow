import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { useTheme } from "../theme/index.js";
import type { ToastVariant, ToastOptions } from "./types.js";
import { DEFAULT_DURATION } from "./types.js";

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: "#9ece6a",
  error: "#f7768e",
  info: "#7aa2f7",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<ToastVariant>("info");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, options?: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    setVariant(options?.variant ?? "info");
    timeoutRef.current = setTimeout(
      () => setMessage(null),
      options?.duration ?? DEFAULT_DURATION,
    );
    timeoutRef.current?.unref();
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <box
          position="absolute"
          top={0}
          right={0}
          marginTop={1}
          marginRight={1}
        >
          <box
            backgroundColor={colors.surface}
            borderStyle="single"
            borderColor={VARIANT_COLORS[variant]}
            border
            paddingX={1}
          >
            <text fg={VARIANT_COLORS[variant]}>{variant.toUpperCase()}</text>
            <text fg={colors.foreground}> {message}</text>
          </box>
        </box>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
