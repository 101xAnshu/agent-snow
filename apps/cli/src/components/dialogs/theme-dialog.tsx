import { THEMES } from "../../themes/index.js";
import { useTheme } from "../../providers/theme/index.js";
import { useDialog } from "../../providers/dialog/index.js";
import { DialogSearchList } from "./dialog-search-list.js";

export function ThemeDialog() {
  const { currentTheme, setTheme } = useTheme();
  const { close } = useDialog();
  return (
    <DialogSearchList
      items={THEMES}
      keyExtractor={(t) => t.name}
      renderItem={(t, h) => (
        <text fg={h ? "white" : "gray"}>
          {t.name === currentTheme ? "✓ " : "  "}
          {t.name}
        </text>
      )}
      onSelect={(theme) => {
        setTheme(theme.name);
        close();
      }}
      filterItems={(items, q) =>
        items.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
      }
    />
  );
}
