import { usePromptConfig } from "../../providers/prompt-config/index.js";
import { useDialog } from "../../providers/dialog/index.js";
import { DialogSearchList } from "./dialog-search-list.js";

export function AgentsDialog() {
  const { toggleMode, mode } = usePromptConfig();
  const { close } = useDialog();
  const items = [
    { label: "BUILD", description: "Full access — read, write, edit, execute" },
    { label: "PLAN", description: "Read-only — analyze codebase" },
  ];
  return (
    <DialogSearchList
      items={items}
      keyExtractor={(i) => i.label}
      renderItem={(i, h) => (
        <text fg={h ? "white" : "gray"}>
          {i.label === mode ? "✓ " : "  "}
          {i.label} - {i.description}
        </text>
      )}
      onSelect={(item) => {
        if (item.label !== mode) toggleMode();
        close();
      }}
    />
  );
}
