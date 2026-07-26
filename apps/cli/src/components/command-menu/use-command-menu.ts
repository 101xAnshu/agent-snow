import { useState, useCallback, useMemo, useRef } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { getFilteredCommands } from "./filter-commands.js";
import { useKeyboardLayer } from "../../providers/keyboard-layer/index.js";

export function useCommandMenu() {
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { push, pop, isTopLayer } = useKeyboardLayer();

  const close = useCallback(() => {
    setCommandQuery(null);
    setSelectedIndex(0);
    pop("command");
  }, [pop]);

  const handleContentChange = useCallback((text: string) => {
    setSelectedIndex(0);
    const sb = scrollRef.current;
    if (sb) sb.scrollTo(0);

    if (text.startsWith("/") && !text.includes(" ")) {
      const query = text.slice(1);
      setCommandQuery(query);
      push("command", () => { close(); return true; });
    } else {
      close();
    }
  }, [close, push]);

  const showCommandMenu = commandQuery !== null;

  const filteredCommands = useMemo(
    () => getFilteredCommands(commandQuery ?? ""),
    [commandQuery],
  );

  const resolveCommand = useCallback(
    (index: number) => {
      const command = filteredCommands[index];
      if (command) close();
      return command;
    },
    [filteredCommands, close],
  );

  useKeyboard((key) => {
    if (!showCommandMenu || !isTopLayer("command")) return;

    if (key.name === "escape") {
      key.preventDefault();
      close();
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedIndex((i) => {
        const newIndex = Math.max(0, i - 1);
        const sb = scrollRef.current;
        if (sb && newIndex < sb.scrollTop) sb.scrollTo(newIndex);
        return newIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedIndex((i) => {
        if (filteredCommands.length === 0) return 0;
        const newIndex = Math.min(filteredCommands.length - 1, i + 1);
        const sb = scrollRef.current;
        if (sb) {
          const viewportHeight = sb.viewport.height;
          const visibleEnd = sb.scrollTop + viewportHeight - 1;
          if (newIndex > visibleEnd) sb.scrollTo(newIndex - viewportHeight + 1);
        }
        return newIndex;
      });
    }
  });

  return {
    showCommandMenu,
    commandQuery: commandQuery ?? "",
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  };
}
