import * as React from "react";

export const useWebSocket = () => {

  const [webSocket, setWebSocket] = React.useState<WebSocket>();

  React.useEffect(() => {
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    const address = `${protocol}://${window.location.hostname}:8080`;
    const ws = new WebSocket(address);
    console.log({protocol, address, ws});
    ws.onopen = () => console.log('OPEN');
    
    setWebSocket(ws);
    return () => {};
  }, []);

  return webSocket;
};
