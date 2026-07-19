import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { z } from "zod";
import { api } from "../lib/api-client.js";

const stateSchema = z.object({
  message: z.string(),
  mode: z.string(),
  model: z.string(),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const parsed = stateSchema.safeParse(location.state);
    if (!parsed.success) {
      navigate("/");
      return;
    }

    const { message, mode, model } = parsed.data;
    api
      .createSession(message.slice(0, 100))
      .then((res) =>
        navigate(`/sessions/${res.session.id}`, {
          state: { initialMessage: message, mode, model },
        }),
      )
      .catch((err) => {
        console.error("Failed to create session:", err);
        navigate("/");
      });
  }, [navigate, location.state]);

  return null;
}
