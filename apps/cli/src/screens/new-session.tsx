import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { z } from "zod";
import { Mode } from "shared";
import { SessionShell } from "../components/session-shell.js";
import { UserMessage } from "../components/messages/index.js";
import { useToast } from "../providers/toast/index.js";
import { api } from "../lib/api-client.js";
const newSessionStateSchema = z.object({
  message: z.string(),
  mode: z.nativeEnum(Mode),
  model: z.string(),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const hasStartedRef = useRef(false);

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    if (!state || hasStartedRef.current) return;

    hasStartedRef.current = true;

    let ignore = false;
    const createSession = async () => {
      try {
        const res = await api.createSession(state.message.slice(0, 100));

        if (ignore) return;
        navigate(`/sessions/${res.session.id}`, {
          replace: true,
          state: { initialMessage: state.message, mode: state.mode, model: state.model },
        });
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: error instanceof Error ? error.message : "Failed to create session",
        });
        navigate("/", { replace: true });
      }
    };

    createSession();
    return () => {
      ignore = true;
    };
  }, [state, navigate, toast]);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage parts={[{ type: "text", text: state.message }]} mode={state.mode} />
    </SessionShell>
  );
}
