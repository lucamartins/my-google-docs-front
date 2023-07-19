// @ts-nocheck

import { Box, Button, TextField, Typography } from "@mui/material";
import { messageCallbackType } from "@stomp/stompjs";
import { useEffect, useReducer, useRef, useState } from "react";
import { getOperationDetails } from "./helpers";
import { useWebSocketClient } from "./hooks";
import "./styles/App.css";
import { SharedDocument } from "./types";

const TEXT_1 = "Hello!\n\nThis is a shared document.\n\nBlablas!";
const TEXT_2 = "Hello!";

const INITIAL_TEXT = TEXT_2;

// when receiving an operation from the server
// if the operation was made LOCALLY, it does nothing (it is an ACK)
// if operation is REMOTE, verify the need of transformation

// when inserting and deleting ONLY one char per time, transformation will be required when
// previous operations have inserted and/or deleted BEFORE the current operation position index

// note. 1: operations saved in SharedDocument (locally) have to be at transformed version (if required)

// note. 2: it has to look back into all operations made between operation versions
// for instance, current version is 3, and the operation is made in version 1, it has to look into
// operations (transformed) made in version 2 and 3
// so, from OPERATION_VERSION to CURRENT_VERSION

function App() {
  const { client, addSubscriber } = useWebSocketClient();
  const [textContent, setTextContent] = useState<string>(INITIAL_TEXT);
  const textAreaRef = useRef<HTMLTextAreaElement>();
  const [localDocument, updateLocalDocument] = useReducer(
    localDocumentReducer,
    {
      textContent: "",
      currentUserId: "",
      operations: [],
      version: 0,
    }
  );

  function localDocumentReducer(
    state: SharedDocument,
    action: any
  ): SharedDocument {
    return {
      ...state,
    };
  }

  //
  // Remote Processing
  //

  // Remote Processing - Subscribers

  const getSharedDocument: messageCallbackType = (data) => {
    const sharedDocument = JSON.parse(data.body) as SharedDocument;
    console.log({ sharedDocument });
  };

  const getOperationFromServer: messageCallbackType = () => {};

  // Remote Processing - Publishers

  const sendOperationToServer = () => {};

  //
  // Local Processing
  //

  const handleLocalTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // update the textContent
    // mount and send the operation to the server

    const operationDetails = getOperationDetails(textContent, e.target.value);
    console.log(operationDetails, "interceptor called");
    setTextContent(e.target.value);
  };

  const applyRemoteOperationLocally = () => {};

  const transformOperation = () => {};

  useEffect(() => {
    if (!client.connected) return;
    addSubscriber("/getSharedFile", getSharedDocument);
  }, [client, addSubscriber]);

  const handleTest = () => {
    // this test shows that when injecting text, the cursor position requires to be updated (transformed)
    setTextContent((text) => text.padStart(text.length + 3, "a"));
  };

  useEffect(() => {
    // call handleTest after 5 seconds
    setTimeout(() => {
      handleTest();
    }, 5000);
  }, []);

  const isWebSocketConnected = client.connected;

  return (
    <Box>
      <Box mb={4}>
        <Typography>
          Status atual:{" "}
          <span style={{ fontWeight: "bold" }}>
            {isWebSocketConnected ? "conectado" : "desconectado"}
          </span>
        </Typography>
        <Button color="success" disabled={isWebSocketConnected}>
          Conectar WebSocket
        </Button>
        <Button color="error" disabled={!isWebSocketConnected}>
          Desconectar WebSocket
        </Button>
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
          inputRef={textAreaRef}
        />
      </Box>
      <Button onClick={handleTest}>General Purpose Test Button</Button>
    </Box>
  );
}

export default App;
