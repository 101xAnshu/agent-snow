import type { ModeType, ThinkingLevel } from "shared";
import type { SupportedChatModelId } from "shared";
import type { useDialog } from "../../providers/dialog/index.js";
import type { useToast } from "../../providers/toast/index.js";
import type { useNavigate } from "react-router";

export type CommandContext = {
  exit: () => void;
  toast: ReturnType<typeof useToast>;
  dialog: ReturnType<typeof useDialog>;
  navigate: ReturnType<typeof useNavigate>;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  setModel: (model: SupportedChatModelId) => void;
  setThinkingLevel: (level: ThinkingLevel) => void;
};

export type Command = {
  name: string;
  description: string;
  value: string;
  action?: (ctx: CommandContext) => void | Promise<void>;
};
