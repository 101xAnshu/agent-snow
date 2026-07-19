import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../providers/theme/index.js";
import { useToast } from "../providers/toast/index.js";
import { usePromptConfig } from "../providers/prompt-config/index.js";

type Props = {
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function InputBar({
  onSubmit,
  placeholder = "Type a message...",
  disabled,
}: Props) {
  const [value, setValue] = useState("");
  const { colors } = useTheme();
  const { mode, toggleMode } = usePromptConfig();
  const { show } = useToast();

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue("");
  }, [value, disabled, onSubmit]);

  useKeyboard((key) => {
    if (disabled) return false;
    if (key.name === "enter") {
      handleSubmit();
      return true;
    }
    if (key.name === "tab") {
      toggleMode();
      show(`Switched to ${mode === "BUILD" ? "PLAN" : "BUILD"} mode`, {
        variant: "info",
      });
      return true;
    }
    if (key.name === "escape" && value) {
      setValue("");
      return true;
    }
    return false;
  });

  return (
    <box flexDirection="row" alignItems="center" paddingX={1}>
      <text fg={colors.accent}>
        <b>{mode === "BUILD" ? ">" : "~"}</b>
      </text>
      <input
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        flexGrow={1}
        textColor={colors.foreground}
        placeholderColor={colors.muted}
        backgroundColor="transparent"
      />
    </box>
  );
}
