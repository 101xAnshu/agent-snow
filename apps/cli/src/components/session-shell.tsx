import type { ReactNode } from "react";
import { useTheme } from "../providers/theme/index.js";
import { usePromptConfig } from "../providers/prompt-config/index.js";
import { useKeyboard } from "@opentui/react";

type Props = {
  children: ReactNode;
  onSubmit: (text: string) => void;
  isLoading: boolean;
  onInterrupt: () => void;
};

export function SessionShell({
  children,
  onSubmit,
  isLoading,
  onInterrupt,
}: Props) {
  const { colors } = useTheme();
  const { mode, model } = usePromptConfig();

  useKeyboard((key: { name: string }) => {
    if (key.name === "escape" && isLoading) {
      onInterrupt();
      return true;
    }
    return false;
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <scrollbox flexGrow={1} flexShrink={1}>
        {children}
      </scrollbox>
      <box
        height={3}
        borderStyle="single"
        border={["top"]}
        borderColor={colors.border}
      >
        <inputbar
          onSubmit={onSubmit}
          placeholder="Type a message..."
          disabled={isLoading}
        />
      </box>
      <box height={1}>
        {isLoading && (
          <text fg="yellow">
            Thinking... <text fg={colors.muted}>esc to interrupt</text>
          </text>
        )}
        <text fg={colors.muted}>
          {mode} · {model}
        </text>
      </box>
    </box>
  );
}
