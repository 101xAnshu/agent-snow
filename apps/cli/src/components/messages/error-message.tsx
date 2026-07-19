import { useTheme } from "../../providers/theme/index.js";

type Props = { error: string };

export function ErrorMessage({ error }: Props) {
  const { colors } = useTheme();
  return (
    <box flexDirection="row" marginTop={1}>
      <border
        style={{ type: "single", fg: colors.error, sides: { left: true } }}
      >
        <text fg={colors.error}>{error}</text>
      </border>
    </box>
  );
}
