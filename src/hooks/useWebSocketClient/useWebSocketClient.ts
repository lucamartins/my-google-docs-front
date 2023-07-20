import { Client, messageCallbackType } from "@stomp/stompjs";
import { useCallback, useMemo, useState } from "react";

const WEBSOCKET_URL = "wss://projetoufg.com.br/gs-guide-websocket";

const useWebSocketClient = () => {
  const [isConnected, setIsConnected] = useState(false);

  const client = useMemo(
    () =>
      new Client({
        brokerURL: WEBSOCKET_URL,
        reconnectDelay: 5000,
        onConnect: () => {
          console.log("Connected to WebSocket");
          setIsConnected(true);
        },
        onStompError: (frame) => {
          console.group("WS - Broker reported error");
          console.error("Broker reported error: " + frame.headers["message"]);
          console.error("Additional details: " + frame.body);
          console.groupEnd();
        },
        onDisconnect: () => {
          console.log("Disconnected from WebSocket");
          setIsConnected(false);
        },
      }),
    []
  );

  const addSubscriber = useCallback(
    (destination: string, callback: messageCallbackType) => {
      console.log("Adding subscriber to: " + destination);

      try {
        if (!client || !client.connected) {
          throw new Error("Client not connected");
        }

        client.subscribe(destination, callback);
      } catch (error) {
        console.error({ error });
      }
    },
    [client]
  );

  const connectWebSocket = useCallback(() => {
    if (!client || client.connected) {
      throw new Error("Client already connected");
    }

    client.activate();
  }, [client]);

  const disconnectWebSocket = useCallback(async () => {
    if (!client || !client.connected) {
      throw new Error("Client not connected");
    }

    await client.deactivate();
  }, [client]);

  return {
    client,
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
    addSubscriber,
  };
};

export default useWebSocketClient;
