import * as React from "react";

export const useWebSocket = () => {
  const [webSocket, setWebSocket] = React.useState<WebSocket>();

  const [closed, setClosed] = React.useState(false);

  React.useEffect(() => {
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";
    const port = !window.location.hostname.includes("herokuapp") ? ":8080" : "";
    const address = `${protocol}://${window.location.hostname}${port}`;
    const ws = new WebSocket(address);

    setWebSocket(ws);

    ws.onclose = () => setClosed(true);

    return () => {
      ws.onclose = null;
    };
  }, []);

  return {
    ws: webSocket,
    wsClosed: closed,
  };
};
