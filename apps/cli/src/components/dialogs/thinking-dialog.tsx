import { useCallback } from "react";
import type { ThinkingLevel } from "shared";
import { useDialog } from "../../providers/dialog/index.js";
import { DialogSearchList } from "../dialog-search-list.js";

const LEVELS: ThinkingLevel[] = ["off", "low", "medium", "high"];

export function ThinkingDialogContent({
  onSelect,
}: {
  onSelect: (level: ThinkingLevel) => void;
}) {
  const dialog = useDialog();
  const select = useCallback(
    (level: ThinkingLevel) => {
      onSelect(level);
      dialog.close();
    },
    [dialog, onSelect],
  );

  return (
    <DialogSearchList
      items={LEVELS}
      onSelect={select}
      filterFn={(level, query) => level.includes(query.toLowerCase())}
      renderItem={(level, selected) => (
        <text selectable={false} fg={selected ? "black" : "white"}>
          {level}
        </text>
      )}
      getKey={(level) => level}
      placeholder="Search thinking levels"
      emptyText="No matching level"
    />
  );
}
