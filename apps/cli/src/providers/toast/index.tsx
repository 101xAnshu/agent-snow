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
  show: (options: ToastOptions) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const variantColors: Record<ToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  const show = useCallback((options: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentToast(options);
    timeoutRef.current = setTimeout(
      () => setCurrentToast(null),
      options.duration ?? DEFAULT_DURATION,
    );
    timeoutRef.current?.unref();
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
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
            borderColor={variantColors[currentToast.variant ?? "info"]}
            border
            paddingX={1}
          >
            <text fg={variantColors[currentToast.variant ?? "info"]}>{(currentToast.variant ?? "info").toUpperCase()}</text>
            <text fg={colors.foreground}> {currentToast.message}</text>
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
