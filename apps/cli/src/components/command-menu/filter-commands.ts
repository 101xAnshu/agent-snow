import { COMMANDS } from "./commands.js";

export function getFilteredCommands(query: string) {
  if (!query) return COMMANDS;
  
  const lowerQuery = query.toLowerCase();
  return COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(lowerQuery));
}
