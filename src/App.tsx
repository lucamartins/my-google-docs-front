import { Box, TextField, Typography } from "@mui/material";
import { Client } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateNewCursorPosition,
  getTextChangeDetails,
  transformOperation,
} from "./helpers";
import "./styles/App.css";
import { Operation, OperationTypeEnum, SharedDocument } from "./types";

const WEBSOCKET_URL = "wss://projetoufg.com.br/gs-guide-websocket";
let HAVE_CONNECTED = false;

function App() {
  const [count, setCount] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [client, setClient] = useState<Client | null>();
  const [sharedDocument, setSharedDocument] = useState<SharedDocument>();
  const [textContent, setTextContent] = useState<string>("");
  const [oldTextContent, setOldTextContent] = useState<string>("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCursorRepositionPending, setIsCursorRepositionPending] =
    useState(false);
  const [isWaitingAck, setIsWaitingAck] = useState(false);
  const [undoLocal, setUndoLocal] = useState(false);

  const [pendingAckLocalOp, setPendingAckLocalOp] = useState<
    Operation | undefined
  >();

  const sharedDocumentRef = useRef<SharedDocument>();
  sharedDocumentRef.current = sharedDocument;

  const isWaitingAckRef = useRef<boolean>(false);
  isWaitingAckRef.current = isWaitingAck;

  const pendingAckLocalOpRef = useRef<Operation>();
  pendingAckLocalOpRef.current = pendingAckLocalOp;

  const textAreaRef = useRef<HTMLTextAreaElement>();

  const refCallback = useCallback(setTextAreaRefAndCursorObserver, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(updateCursorPositionWhenRequired, [
    textContent,
    sharedDocumentRef.current?.operations,
  ]);

  useEffect(() => {
    if (!textAreaRef.current || !undoLocal) {
      return;
    }

    textAreaRef.current.selectionStart = cursorPosition;
    textAreaRef.current.selectionEnd = cursorPosition;

    setUndoLocal(false);
  }, [undoLocal, cursorPosition]);

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
    const lastOperation = sharedDocumentRef.current?.operations.slice(-1)[0];

    if (!isCursorRepositionPending || !textAreaRef.current || !lastOperation) {
      setOldTextContent(textContent);
      setIsCursorRepositionPending(false);
      return;
    }

    const lastOperationCursorIsAfterCurrentCursor =
      lastOperation.position >= cursorPosition;

    const newCursorPos = !lastOperationCursorIsAfterCurrentCursor
      ? calculateNewCursorPosition(
          cursorPosition,
          oldTextContent.length,
          textContent.length
        )
      : cursorPosition;

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

    setIsWaitingAck(true);

    setSharedDocument({
      ...sharedDocument,
      localOperation: sharedDocument.localOperation,
    });

    client.publish({
      destination: "/app/doOperation",
      body: JSON.stringify(operation),
    });
  };

  //
  // Local Processing
  //

  const handleLocalTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (!sharedDocument) {
      throw new Error("Must have shared document defined");
    }

    if (isWaitingAckRef.current) {
      // console.log({ textContent: e.target.value, oldTextContent });
      setCount((count) => count + 1);
      setUndoLocal(true);
      return oldTextContent;
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

    setPendingAckLocalOp(mountedServerOperation);
    sendOperationToServer(mountedServerOperation);
    setTextContent(e.target.value);
  };

  const applyRemoteOperationLocally = (operation: Operation) => {
    if (!sharedDocumentRef.current) {
      return;
    }

    if (operation.userId === sharedDocumentRef.current.currentUserId) {
      setSharedDocument({
        ...sharedDocumentRef.current,
        version: sharedDocumentRef.current.version + 1,
        operations: [...sharedDocumentRef.current.operations, operation],
        localOperation: null,
      });

      if (isWaitingAckRef.current) {
        setIsWaitingAck(false);
        textAreaRef?.current?.focus();
      }

      if (pendingAckLocalOpRef?.current?.version === operation.version) {
        setPendingAckLocalOp(undefined);
      }

      return;
    }

    // while (
    //   sharedDocumentRef.current.localOperation?.version !==
    //   pendingAckLocalOpRef.current
    // ) {
    //   const isWaitingAck = pendingAckLocalOpRef.current;
    //   console.log({ isWaitingAck });
    // }

    console.log({ localOp: pendingAckLocalOpRef.current });

    const transformedOperation = transformOperation(operation, [
      ...sharedDocumentRef.current.operations,
      ...(pendingAckLocalOpRef.current
        ? [{ ...pendingAckLocalOpRef.current, isPendingAck: true }]
        : []),
    ]);

    if (transformedOperation.type === OperationTypeEnum.Insert) {
      setTextContent((text) => {
        const textContentSplitted = text.split("");

        textContentSplitted.splice(
          transformedOperation.position,
          0,
          transformedOperation.value
        );

        // console.log("vou INSERIR caracter do servidor", {
        //   text,
        //   transformedOperation,
        //   finalText: textContentSplitted,
        // });

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

        // console.log("vou DELETAR caracter do servidor", {
        //   text,
        //   transformedOperation,
        //   finalText: textContentSplitted,
        // });

        return textContentSplitted.join("");
      });
    }

    setSharedDocument({
      ...sharedDocumentRef.current,
      version: sharedDocumentRef.current.version + 1,
      operations: [
        ...sharedDocumentRef.current.operations,
        transformedOperation,
      ],
    });

    setIsCursorRepositionPending(true);
  };

  // *
  // * Web Socket Remote Processing - Subscribers
  // *

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const client = new Client({
      brokerURL: WEBSOCKET_URL,
      // reconnectDelay: 5000,
      onConnect: () => {
        setIsWebSocketConnected(true);
        client.subscribe("/app/getSharedFile", (data) => {
          const sharedDocument = JSON.parse(data.body) as SharedDocument;
          setSharedDocument({
            ...sharedDocument,
            localOperation: null,
          });
          setTextContent(sharedDocument.textContent.join(""));
        });
        client.subscribe("/topic/versionUpdate", (data) => {
          const operation = JSON.parse(data.body) as Operation;
          applyRemoteOperationLocally(operation);
        });
      },
      onStompError: (frame) => {
        console.group("WS - Broker reported error");
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
        console.groupEnd();
      },
      onDisconnect: () => {
        HAVE_CONNECTED = false;
      },
    });

    if (!HAVE_CONNECTED) {
      HAVE_CONNECTED = true;
      client.activate();
      setClient(client);
    }
  }, []);

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
          onChange={(e) => {
            handleLocalTextChange(e);
          }}
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

        <Typography>Count: {count}</Typography>
      </Box>
    </Box>
  );
}

export default App;
