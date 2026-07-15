import { useTheme } from "../providers/theme/index.js";

export function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <box width="100%" height="100%" backgroundColor={colors.background} flexDirection="column">
      {children}
    </box>
  );
}
