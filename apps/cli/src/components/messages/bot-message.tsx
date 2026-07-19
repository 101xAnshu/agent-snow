import { useTheme } from "../../providers/theme/index.js";

type Props = {
  parts: Array<Record<string, unknown>>;
  mode: string;
  model: string;
  durationMs?: number;
};

export function BotMessage({ parts, mode, model, durationMs }: Props) {
  const { colors } = useTheme();
  return (
    <box flexDirection="column" marginTop={1}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <text key={i} fg={colors.foreground}>
              {(part as { text: string }).text}
            </text>
          );
        }
        if (part.type === "tool-invocation") {
          const inv = (
            part as {
              toolInvocation: {
                toolName: string;
                state: string;
                args?: Record<string, unknown>;
                output?: string;
                error?: string;
              };
            }
          ).toolInvocation;
          return (
            <box key={i} flexDirection="column" marginTop={1}>
              <text fg={colors.accent}>
                <b>Tool: {inv.toolName}</b>
              </text>
              {inv.state === "call" && <text fg="yellow">Running...</text>}
              {inv.state === "result" && (
                <text fg="green">
                  ✓{" "}
                  {typeof inv.output === "string"
                    ? inv.output.slice(0, 100)
                    : "Done"}
                </text>
              )}
              {inv.state === "error" && <text fg="red">✗ {inv.error}</text>}
            </box>
          );
        }
        if (part.type === "reasoning") {
          const r = part as { reasoning: string };
          return (
            <text key={i} fg={colors.muted}>
              {(r.reasoning ?? "").slice(0, 200)}
            </text>
          );
        }
        return null;
      })}
      <text fg={colors.muted} marginTop={1}>
        {mode} · {model}
        {durationMs ? ` · ${durationMs}ms` : ""}
      </text>
    </box>
  );
}
