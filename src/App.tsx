import { Box, Button, TextField, Typography } from "@mui/material";
import { messageCallbackType } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateNewCursorPosition } from "./helpers";
import { useWebSocketClient } from "./hooks";
import "./styles/App.css";
import { Operation, OperationTypeEnum, SharedDocument } from "./types";

// TODO: remove mock
const TEXT = "Hello!";
const INITIAL_TEXT = TEXT;

function App() {
  const {
    client,
    isConnected: isWebSocketConnected,
    addSubscriber,
    connectWebSocket,
    disconnectWebSocket,
  } = useWebSocketClient();

  const [textContent, setTextContent] = useState<string>(INITIAL_TEXT);
  const [oldTextContent, setOldTextContent] = useState<string>(INITIAL_TEXT);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCursorRepositionPending, setIsCursorRepositionPending] =
    useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>();

  const refCallback = useCallback(setTextAreaRefAndCursorObserver, []);

  useEffect(updateCursorPositionWhenRequired, [
    cursorPosition,
    isCursorRepositionPending,
    oldTextContent.length,
    textContent,
  ]);

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
  // * Web Socket Remote Processing - Subscribers
  // *

  const getSharedDocument: messageCallbackType = (data) => {
    const sharedDocument = JSON.parse(data.body) as SharedDocument;
    console.log({ sharedDocument });
  };

  // const getOperationFromServer: messageCallbackType = () => {};

  // *
  // * Web Socket Remote Processing - Publishers
  // *

  // const sendOperationToServer = () => {
  //   const mockOperation: Operation = {
  //     type: OperationTypeEnum.Insert,
  //     position: 0,
  //     value: "a",
  //     userId: "123",
  //     version: 1,
  //   };

  //   client.publish({
  //     destination: "/doOperation",
  //     body: JSON.stringify(mockOperation),
  //   });
  // };

  //
  // Local Processing
  //

  // const transformOperation = () => {};

  const handleLocalTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isCursorRepositionPending) return;

    // todo: mount and send the operation to the server
    // const operationDetails = getTextChangeDetails(textContent, e.target.value);

    setTextContent(e.target.value);
  };

  const applyRemoteOperationLocally = (operation: Operation) => {
    if (operation.type === OperationTypeEnum.Insert) {
      setTextContent((text) => {
        const textContentSplitted = text.split("");
        textContentSplitted.splice(operation.position, 0, operation.value);
        return textContentSplitted.join("");
      });
    }

    if (operation.type === OperationTypeEnum.Delete) {
      setTextContent((text) => {
        const textContentSplitted = text.split("");
        textContentSplitted.splice(operation.position, operation.value.length);
        return textContentSplitted.join("");
      });
    }

    setIsCursorRepositionPending(true);
  };

  function setUpWebSocket() {
    if (!client.connected) return;
    console.log({ addSubscriber });

    addSubscriber("/getSharedFile", getSharedDocument);
  }

  function handleCloseWebSocket() {
    void disconnectWebSocket();
  }

  useEffect(setUpWebSocket, [client.connected, addSubscriber]);

  useEffect(() => {
    setTimeout(() => {
      applyRemoteOperationLocally({
        position: 0,
        type: OperationTypeEnum.Insert,
        value: "a",
        userId: "123",
        version: 1,
      });
      applyRemoteOperationLocally({
        position: 0,
        type: OperationTypeEnum.Insert,
        value: "\n",
        userId: "123",
        version: 1,
      });
      applyRemoteOperationLocally({
        position: 0,
        type: OperationTypeEnum.Insert,
        value: "a\n\n",
        userId: "123",
        version: 1,
      });
    }, 3500);
  }, []);

  return (
    <Box>
      <Box mb={4}>
        <Typography>
          Status atual:{" "}
          <span style={{ fontWeight: "bold" }}>
            {isWebSocketConnected ? "conectado" : "desconectado"}
          </span>
        </Typography>
        {!isWebSocketConnected && (
          <Button
            color="success"
            disabled={isWebSocketConnected}
            onClick={connectWebSocket}
          >
            Conectar WebSocket
          </Button>
        )}
        {isWebSocketConnected && (
          <Button
            color="error"
            disabled={!isWebSocketConnected}
            onClick={handleCloseWebSocket}
          >
            Desconectar WebSocket
          </Button>
        )}
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
          inputProps={{
            id: "my-textarea",
          }}
        />
      </Box>
      <Button onClick={() => console.log("Test")}>
        General Purpose Test Button
      </Button>
    </Box>
  );
}

export default App;
