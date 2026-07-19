import { useTheme } from "../../providers/theme/index.js";

type Props = { parts: Array<{ type: string; text?: string }>; mode: string };

export function UserMessage({ parts, mode }: Props) {
  const { colors } = useTheme();
  const text = parts
    .map((p) => (p.type === "text" ? (p.text ?? "") : ""))
    .join("");
  return (
    <box flexDirection="row" marginTop={1}>
      <border
        style={{
          type: "single",
          fg: mode === "BUILD" ? colors.accent : colors.primary,
          sides: { left: true },
        }}
      >
        <text fg={colors.foreground}>{text}</text>
      </border>
    </box>
  );
}
