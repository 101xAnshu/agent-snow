import { Mode, type ModeType } from "shared";
import { EmptyBorder } from "../border.js";
import { useTheme } from "../../providers/theme/index.js";

type Props = {
  parts: Array<{ type: string; text?: string }>;
  mode: ModeType;
};

export function UserMessage({ parts, mode }: Props) {
  const { colors } = useTheme();
  const text = parts
    .map((p) => (p.type === "text" ? (p.text ?? "") : ""))
    .join("");

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={mode === Mode.PLAN ? colors.planMode : colors.primary}
        width="100%"
        customBorderChars={{
          ...EmptyBorder,
          vertical: "┃",
          bottomLeft: "╹",
        }}
      >
        <box
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
        >
          <text>{text}</text>
        </box>
      </box>
    </box>
  );
}
