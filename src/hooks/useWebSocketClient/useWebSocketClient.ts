import { Client, messageCallbackType } from "@stomp/stompjs";
import { useEffect, useMemo } from "react";

const WEBSOCKET_URL = "ws://192.168.6.119:8080/gs-guide-websocket";

const useWebSocketClient = () => {
  const client = useMemo(
    () =>
      new Client({
        brokerURL: WEBSOCKET_URL,
        reconnectDelay: 5000,
        onConnect: () => {
          console.log("Connected to WebSocket");
        },
        onStompError: (frame) => {
          console.error("Broker reported error: " + frame.headers["message"]);
          console.error("Additional details: " + frame.body);
        },
      }),
    []
  );

  useEffect(() => {
    client.activate();
  }, [client]);

  const addSubscriber = (
    destination: string,
    callback: messageCallbackType
  ) => {
    try {
      if (!client || !client.connected) {
        throw new Error("Client not connected");
      }

      client.subscribe(destination, callback);
    } catch (error) {
      console.error({ error });
    }
  };

  return {
    client,
    addSubscriber,
  };
};

export default useWebSocketClient;
