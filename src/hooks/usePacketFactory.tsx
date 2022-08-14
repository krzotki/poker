import * as React from "react";

export const usePacketFactory = (ws: WebSocket | undefined) => {
  const [packetQueue, setPacketQueue] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!ws) {
      return;
    }

    ws.onopen = () => {
      packetQueue.forEach((p) => ws.send(JSON.stringify(p)));
      setPacketQueue([]);
    };

    return () => {
      ws.onopen = null;
    };
  }, [ws, packetQueue]);

  const send = React.useCallback(
    (packet: any) => {
      if (!ws) return;

      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(packet));
      } else {
        setPacketQueue((q) => [...q, packet]);
      }
    },
    [ws]
  );

  const sendMessage = React.useCallback(
    (message: string) => {
      send({
        type: "MESSAGE",
        payload: message,
      });
    },
    [send]
  );

  const setUserName = React.useCallback(
    (username?: string) => {
      send({
        type: "SET_USERNAME",
        payload: username,
      });
    },
    [send]
  );

  const createRoom = React.useCallback(
    (roomName?: string, password?: string) => {
      send({
        type: "CREATE_ROOM",
        payload: {
          roomName,
          password,
        },
      });
    },
    [send]
  );

  const joinRoom = React.useCallback(
    (roomName?: string, password?: string) => {
      send({
        type: "JOIN_ROOM",
        payload: {
          roomName,
          password,
        },
      });
    },
    [send]
  );

  const joinRoomViaKey = React.useCallback(
    (key: string) => {
      send({
        type: "JOIN_ROOM_VIA_KEY",
        payload: {
          key,
        },
      });
    },
    [send]
  );

  const setVote = React.useCallback(
    (vote: number | undefined) => {
      send({
        type: "SET_VOTE",
        payload: vote,
      });
    },
    [send]
  );

  const uncoverCards = React.useCallback(() => {
    send({
      type: "UNCOVER_CARDS",
    });
  }, [send]);

  const resetVoting = React.useCallback(() => {
    send({
      type: "RESET_VOTING",
    });
  }, [send]);

  const quitRoom = React.useCallback(() => {
    send({
      type: "QUIT_ROOM",
    });
  }, [send]);

  const sendPong = React.useCallback(() => {
    send({
      type: "PONG",
    });
  }, [send]);

  const wakeUserUp = React.useCallback(
    (id: string) => {
      send({
        type: "WAKE_USER_UP",
        payload: {
          id,
        },
      });
    },
    [send]
  );

  return {
    sendMessage,
    setUserName,
    createRoom,
    joinRoom,
    setVote,
    uncoverCards,
    resetVoting,
    quitRoom,
    sendPong,
    joinRoomViaKey,
    wakeUserUp,
  };
};
