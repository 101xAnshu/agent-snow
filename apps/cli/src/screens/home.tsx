import { useCallback } from "react";
import { useNavigate } from "react-router";
import { InputBar } from "../components/input-bar.js";
import { usePromptConfig } from "../providers/prompt-config/index.js";

export function Home() {
  const navigate = useNavigate();
  const { mode, model } = usePromptConfig();

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      navigate("/sessions/new", { state: { message: text, mode, model } });
    },
    [navigate, mode, model],
  );

  return (
    <box
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <ascii-font text="AgentSnow" font="slick" />
      <text>
        <b>Terminal AI Coding Agent</b>
      </text>
      <InputBar onSubmit={handleSubmit} />
      <text fg="gray">Tab to toggle mode · /agents · /models</text>
    </box>
  );
}
