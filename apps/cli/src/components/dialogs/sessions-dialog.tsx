import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../lib/api-client.js";
import { DialogSearchList } from "./dialog-search-list.js";
import { useDialog } from "../../providers/dialog/index.js";

export function SessionsDialog() {
  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const navigate = useNavigate();
  const { close } = useDialog();

  useEffect(() => {
    api
      .listSessions(100, 0)
      .then((res) =>
        setSessions(res.sessions as Array<{ id: string; title: string }>),
      );
  }, []);

  return (
    <DialogSearchList
      items={sessions}
      keyExtractor={(s) => s.id}
      renderItem={(s, h) => <text fg={h ? "white" : "gray"}>{s.title}</text>}
      onSelect={(session) => {
        navigate(`/sessions/${session.id}`);
        close();
      }}
    />
  );
}
