import { useCallback, useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useDialog } from "../../providers/dialog/index.js";
import { useToast } from "../../providers/toast/index.js";
import { api } from "../../lib/api-client.js";
import { DialogSearchList } from "../dialog-search-list.js";

type Session = {
  id: string;
  title: string;
  createdAt: string;
};

export const SessionsDialogContent = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { close } = useDialog();
  const navigate = useNavigate();
  const { show } = useToast();

  useEffect(() => {
    let ignore = false;

    const fetchSessions = async () => {
      try {
        const data = await api.listSessions();

        if (!ignore) {
          setSessions(data.sessions as Session[]);
          setLoading(false);
        }
      } catch (error) {
        if (!ignore) {
          show({
            variant: "error",
            message: error instanceof Error ? error.message : "Failed to fetch sessions",
          });
          close();
        }
      }
    };

    fetchSessions();

    return () => {
      ignore = true;
    };
  }, [close, show]);

  const handleSelect = useCallback(
    (session: Session) => {
      close();
      navigate(`/sessions/${session.id}`);
    },
    [close, navigate],
  );

  if (loading) {
    return (
      <box flexDirection="column">
        <text attributes={TextAttributes.DIM}>Loading sessions...</text>
      </box>
    );
  }

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
      filterFn={(session, query) =>
        session.title.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(session, isSelected) => (
        <box flexDirection="column" paddingX={1}>
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {session.title}
          </text>
          <text
            selectable={false}
            attributes={TextAttributes.DIM}
            fg={isSelected ? "black" : "gray"}
          >
            {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </text>
        </box>
      )}
      getKey={(session) => session.id}
      placeholder="Search sessions"
      emptyText="No sessions found"
    />
  );
};
