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
  confirm: (title: string, message: string) => Promise<boolean>;
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
    dialogRef.current?.onClose?.();
    setCurrentDialog(null);
    pop("dialog");
  }, [pop]);

  const confirm = useCallback(
    (title: string, message: string) =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        const settle = (value: boolean) => {
          if (settled) return;
          settled = true;
          resolve(value);
          setCurrentDialog(null);
          pop("dialog");
        };
        open({
          title,
          onClose: () => settle(false),
          children: (
            <ApprovalPrompt
              message={message}
              onApprove={() => settle(true)}
              onDeny={() => settle(false)}
            />
          ),
        });
      }),
    [open, pop],
  );

  const closeRef = useRef(close);
  closeRef.current = close;

  useKeyboard((key: { name: string }) => {
    if (key.name === "escape" && dialogRef.current && isTopLayer("dialog")) {
      closeRef.current();
      return true;
    }
    return false;
  });

  const value = useMemo(() => ({ open, close, confirm }), [open, close, confirm]);

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

function ApprovalPrompt({
  message,
  onApprove,
  onDeny,
}: {
  message: string;
  onApprove: () => void;
  onDeny: () => void;
}) {
  useKeyboard((key: { name: string }) => {
    if (key.name === "y" || key.name === "return") {
      onApprove();
      return true;
    }
    if (key.name === "n" || key.name === "escape") {
      onDeny();
      return true;
    }
    return false;
  });

  return (
    <box flexDirection="column">
      <text>{message}</text>
      <text>Press y to approve for this session or n to deny</text>
    </box>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
