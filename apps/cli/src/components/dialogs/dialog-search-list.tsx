import { useRef, useState, useMemo, type ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../../providers/theme/index.js";
import { useKeyboardLayer } from "../../providers/keyboard-layer/index.js";

type Props<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, highlighted: boolean) => ReactNode;
  onSelect: (item: T) => void;
  filterItems?: (items: T[], query: string) => T[];
  placeholder?: string;
};

export function DialogSearchList<T>({
  items,
  keyExtractor,
  renderItem,
  onSelect,
  filterItems,
  placeholder = "Search...",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { colors } = useTheme();
  const { isTopLayer } = useKeyboardLayer();

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const filtered = useMemo(
    () => (filterItems ? filterItems(items, query) : items),
    [items, query, filterItems],
  );

  if (filtered.length > 0 && selectedIndex >= filtered.length) {
    setSelectedIndex(filtered.length - 1);
  }

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return false;

    if (key.name === "enter" && filtered.length > 0) {
      onSelectRef.current(filtered[selectedIndex]!);
      return true;
    }
    if (key.name === "up") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return true;
    }
    if (key.name === "down") {
      setSelectedIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      return true;
    }
    return false;
  });

  return (
    <box flexDirection="column">
      <input
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        backgroundColor={colors.surface}
        textColor={colors.foreground}
      />
      <scrollbox flexGrow={1} marginTop={1}>
        {filtered.map((item, idx) => (
          <box key={keyExtractor(item)}>
            {renderItem(item, idx === selectedIndex)}
          </box>
        ))}
      </scrollbox>
    </box>
  );
}
