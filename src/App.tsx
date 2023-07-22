import { Box, Button, TextField, Typography } from "@mui/material";
import { Client, messageCallbackType } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateNewCursorPosition,
  getTextChangeDetails,
  transformOperation,
} from "./helpers";
import "./styles/App.css";
import { Operation, OperationTypeEnum, SharedDocument } from "./types";

const WEBSOCKET_URL = "wss://projetoufg.com.br/gs-guide-websocket";

function App() {
  const [isSubscribedToVersionUpdate, setIsSubscribedToVersionUpdate] =
    useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [client, setClient] = useState<Client | null>();
  const [sharedDocument, setSharedDocument] = useState<SharedDocument>();
  const [textContent, setTextContent] = useState<string>("");
  const [oldTextContent, setOldTextContent] = useState<string>("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCursorRepositionPending, setIsCursorRepositionPending] =
    useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>();

  const refCallback = useCallback(setTextAreaRefAndCursorObserver, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(updateCursorPositionWhenRequired, [textContent]);

  function setTextAreaRefAndCursorObserver(node: HTMLTextAreaElement) {
    if (!node) return;

    textAreaRef.current = node;

    const handleCursorPosition = () => {
      if (textAreaRef.current) {
        setCursorPosition(textAreaRef.current.selectionStart);
      }
    };

    const currentTextAreaRef = textAreaRef.current;

    currentTextAreaRef.addEventListener("click", handleCursorPosition);
    currentTextAreaRef.addEventListener("keyup", handleCursorPosition);

    return () => {
      currentTextAreaRef.removeEventListener("click", handleCursorPosition);
      currentTextAreaRef.removeEventListener("keyup", handleCursorPosition);
    };
  }

  function updateCursorPositionWhenRequired() {
    if (!isCursorRepositionPending || !textAreaRef.current) {
      setOldTextContent(textContent);
      return;
    }

    const newCursorPos = calculateNewCursorPosition(
      cursorPosition,
      oldTextContent.length,
      textContent.length
    );

    textAreaRef.current.selectionStart = newCursorPos;
    textAreaRef.current.selectionEnd = newCursorPos;

    setIsCursorRepositionPending(false);
  }

  // *
  // * Web Socket Remote Processing - Publishers
  // *

  const sendOperationToServer = (operation: Operation) => {
    if (!sharedDocument || !client) {
      throw new Error("Must have shared document defined");
    }

    setSharedDocument({
      ...sharedDocument,
      operations: [...sharedDocument.operations, operation],
      version: operation.version + 1,
    });

    client.publish({
      destination: "/app/doOperation",
      body: JSON.stringify(operation),
    });
  };

  //
  // Local Processing
  //

  const handleLocalTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!sharedDocument) {
      throw new Error("Must have shared document defined");
    }

    if (isCursorRepositionPending) return;

    const operationDetails = getTextChangeDetails(textContent, e.target.value);

    const mountedServerOperation = {
      position: operationDetails.position,
      type: operationDetails.type,
      value: operationDetails.value,
      userId: sharedDocument.currentUserId,
      version: sharedDocument.version,
    } as unknown as Operation;

    sendOperationToServer(mountedServerOperation);
    setTextContent(e.target.value);
  };

  const applyRemoteOperationLocally = useCallback(
    (operation: Operation) => {
      if (!sharedDocument) {
        return;
      }

      if (operation.userId === sharedDocument.currentUserId) return;

      const transformedOperation = transformOperation(
        operation,
        sharedDocument.operations
      );

      if (transformedOperation.type === OperationTypeEnum.Insert) {
        setTextContent((text) => {
          const textContentSplitted = text.split("");
          textContentSplitted.splice(
            transformedOperation.position,
            0,
            transformedOperation.value
          );
          return textContentSplitted.join("");
        });
      }

      if (transformedOperation.type === OperationTypeEnum.Delete) {
        setTextContent((text) => {
          const textContentSplitted = text.split("");
          textContentSplitted.splice(
            transformedOperation.position,
            transformedOperation.value.length
          );
          return textContentSplitted.join("");
        });
      }

      setSharedDocument({
        ...sharedDocument,
        version: sharedDocument.version,
      });

      setIsCursorRepositionPending(true);
    },
    [sharedDocument]
  );

  // *
  // * Web Socket Remote Processing - Subscribers
  // *

  const getSharedDocument: messageCallbackType = useCallback((data) => {
    const sharedDocument = JSON.parse(data.body) as SharedDocument;
    setSharedDocument(sharedDocument);
    setTextContent(sharedDocument.textContent.join(""));
  }, []);

  const getOperationFromServer: messageCallbackType = useCallback(
    (data) => {
      const operation = JSON.parse(data.body) as Operation;
      applyRemoteOperationLocally(operation);
    },
    [applyRemoteOperationLocally]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const client = new Client({
      brokerURL: WEBSOCKET_URL,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe("/app/getSharedFile", getSharedDocument);
        setIsWebSocketConnected(true);
      },
      onStompError: (frame) => {
        console.group("WS - Broker reported error");
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
        console.groupEnd();
      },
    });

    client.activate();
    setClient(client);

    // return () => {
    //   client.unsubscribe("/app/getSharedFile");
    //   client.forceDisconnect();
    //   setClient(null);
    // };
  }, []);

  useEffect(() => {
    if (!client?.connected) return;

    client.subscribe("/topic/versionUpdate", getOperationFromServer);

    return () => {
      try {
        client.unsubscribe("/topic/versionUpdate");
      } catch (error) {
        console.log("Can not unsubscribe");
      }
    };
  }, [client, client?.connected, getOperationFromServer]);

  console.log({ sharedDocument });

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h5" mb={2}>
          Status atual:{" "}
          <span style={{ fontWeight: "bold" }}>
            {isWebSocketConnected ? "conectado" : "conectando..."}
          </span>
        </Typography>
      </Box>

      <Box mb={4} width="100%" height="100%">
        <TextField
          id="outlined-multiline-static"
          label="Meu Documento Compartilhado"
          multiline
          rows={20}
          value={textContent}
          onChange={handleLocalTextChange}
          fullWidth={true}
          inputRef={refCallback}
          disabled={!isWebSocketConnected}
          inputProps={{
            id: "my-textarea",
          }}
        />
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="flex-end">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          gap={1.5}
        >
          <Typography>
            Versão atual: {String(sharedDocument?.version)}
          </Typography>
        </Box>

        <Button onClick={() => console.log("Test")}>
          General Purpose Test Button
        </Button>
      </Box>
    </Box>
  );
}

export default App;
