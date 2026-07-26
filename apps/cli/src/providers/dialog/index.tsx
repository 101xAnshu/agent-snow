import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { RGBA } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../theme/index.js";
import { useKeyboardLayer } from "../keyboard-layer/index.js";
import type { DialogConfig } from "./types.js";

type DialogContextValue = {
  open: (config: DialogConfig) => void;
  close: () => void;
};
const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(null);
  const { push, pop, isTopLayer } = useKeyboardLayer();
  const { colors } = useTheme();
  const { width, height } = useTerminalDimensions();

  const dialogRef = useRef(currentDialog);
  dialogRef.current = currentDialog;

  const open = useCallback(
    (config: DialogConfig) => {
      setCurrentDialog(config);
      push("dialog", () => {
        setCurrentDialog(null);
        pop("dialog");
        return true;
      });
    },
    [push, pop],
  );

  const close = useCallback(() => {
    setCurrentDialog(null);
    pop("dialog");
  }, [pop]);

  const closeRef = useRef(close);
  closeRef.current = close;

  useKeyboard((key: { name: string }) => {
    if (key.name === "escape" && dialogRef.current && isTopLayer("dialog")) {
      closeRef.current();
      return true;
    }
    return false;
  });

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {currentDialog && (
        <box
          position="absolute"
          top={0}
          left={0}
          width={width}
          height={height}
          backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
          justifyContent="center"
          alignItems="center"
          onMouseDown={() => close()}
        >
          <box
            backgroundColor={colors.surface}
            borderStyle="single"
            borderColor={colors.border}
            border
            padding={1}
            minWidth={40}
            maxWidth={Math.floor(width * 0.7)}
            maxHeight={Math.floor(height * 0.7)}
            flexDirection="column"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <text fg={colors.foreground}>
              <b>{currentDialog.title}</b>
            </text>
            <box marginTop={1} flexGrow={1} flexShrink={1}>
              {currentDialog.children}
            </box>
          </box>
        </box>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
