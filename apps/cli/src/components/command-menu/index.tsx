import { DialogSearchList } from "../dialogs/dialog-search-list.js";

type Command = { label: string; description: string; action: () => void };

const COMMANDS: Command[] = [
  {
    label: "/agents",
    description: "Toggle between BUILD and PLAN mode",
    action: () => {},
  },
  { label: "/models", description: "Select an AI model", action: () => {} },
  { label: "/sessions", description: "Browse past sessions", action: () => {} },
  { label: "/theme", description: "Change the color theme", action: () => {} },
  { label: "/login", description: "Sign in with GitHub", action: () => {} },
  { label: "/logout", description: "Sign out", action: () => process.exit(0) },
  { label: "/upgrade", description: "Get more credits", action: () => {} },
  {
    label: "/exit",
    description: "Exit AgentSnow",
    action: () => process.exit(0),
  },
];

export function CommandMenu({
  onSelect,
  query,
}: {
  onSelect: (c: Command) => void;
  query: string;
}) {
  return (
    <DialogSearchList
      items={COMMANDS}
      keyExtractor={(c) => c.label}
      renderItem={(c, h) => (
        <text fg={h ? "white" : "gray"}>
          {c.label} - {c.description}
        </text>
      )}
      onSelect={onSelect}
      filterItems={(cmds, q) => cmds.filter((c) => c.label.startsWith(q))}
      placeholder={query ?? "/"}
    />
  );
}
