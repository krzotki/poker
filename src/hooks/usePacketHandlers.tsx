import * as React from "react";

type PacketType =
  | "MESSAGE"
  | "ROOM_INFO"
  | "ERROR_MESSAGE"
  | "SET_USERNAME"
  | "PING" 
  | "WAKE_UP";

export const usePacketHandlers = (
  ws: WebSocket | undefined,
  handlers: Partial<{ [key in PacketType]: (packet: any) => void }>
) => {
  React.useEffect(() => {
    if (!ws) return;
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      console.log({ data });

      const packetType = data.type as PacketType;

      handlers[packetType]?.(data.payload);
    };

    return () => {
      ws.onmessage = null;
    };
  }, [ws, handlers]);
};
