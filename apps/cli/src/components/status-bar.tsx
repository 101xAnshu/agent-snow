import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme/index.js";
import { usePromptConfig } from "../providers/prompt-config/index.js";
import { findSupportedChatModel, Mode } from "shared";

export function StatusBar() {
  const { mode, model, contextTokens } = usePromptConfig();
  const { colors } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
        {mode === Mode.PLAN ? "Plan" : "Build"}
      </text>

      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        ›
      </text>
      <text>{model}</text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        {contextTokens.toLocaleString()} / {(findSupportedChatModel(model)?.meta.contextWindow ?? 0).toLocaleString()}
      </text>
    </box>
  );
}
