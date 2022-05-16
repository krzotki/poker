import * as React from "react";

export const useWebSocket = () => {

  const [webSocket, setWebSocket] = React.useState<WebSocket>();

  React.useEffect(() => {
    const address = "ws://localhost:8080";
    const ws = new WebSocket(address);
    setWebSocket(ws);
    return () => {};
  }, []);

  return webSocket;
};
