import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Mode, DEFAULT_CHAT_MODEL_ID } from "shared";
import type { ModeType, SupportedChatModelId } from "shared";

type PromptConfigValue = {
  mode: ModeType;
  model: SupportedChatModelId;
  setMode: (m: ModeType) => void;
  setModel: (m: SupportedChatModelId) => void;
  toggleMode: () => void;
};

const PromptConfigContext = createContext<PromptConfigValue | null>(null);

export function PromptConfigProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ModeType>(Mode.BUILD);
  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );
  const toggleMode = useCallback(
    () => setMode((prev) => (prev === Mode.BUILD ? Mode.PLAN : Mode.BUILD)),
    [],
  );
  const value = useMemo(
    () => ({ mode, model, setMode, setModel, toggleMode }),
    [mode, model],
  );
  return (
    <PromptConfigContext.Provider value={value}>
      {children}
    </PromptConfigContext.Provider>
  );
}

export function usePromptConfig(): PromptConfigValue {
  const ctx = useContext(PromptConfigContext);
  if (!ctx)
    throw new Error(
      "usePromptConfig must be used within a PromptConfigProvider",
    );
  return ctx;
}
