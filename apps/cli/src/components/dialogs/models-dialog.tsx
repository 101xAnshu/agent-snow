import { SUPPORTED_CHAT_MODELS } from "shared";
import { usePromptConfig } from "../../providers/prompt-config/index.js";
import { useDialog } from "../../providers/dialog/index.js";
import { DialogSearchList } from "./dialog-search-list.js";

export function ModelsDialog() {
  const { model, setModel } = usePromptConfig();
  const { close } = useDialog();
  return (
    <DialogSearchList
      items={[...SUPPORTED_CHAT_MODELS]}
      keyExtractor={(m) => m.id}
      renderItem={(m, h) => (
        <text fg={h ? "white" : "gray"}>
          {m.id === model ? "✓ " : "  "}
          {m.meta.displayName}
        </text>
      )}
      onSelect={(item) => {
        setModel(item.id);
        close();
      }}
      filterItems={(items, q) =>
        items.filter(
          (m) =>
            m.meta.displayName.toLowerCase().includes(q.toLowerCase()) ||
            m.id.includes(q),
        )
      }
    />
  );
}
