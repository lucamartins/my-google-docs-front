import { Box, TextField } from "@mui/material";
import { messageCallbackType } from "@stomp/stompjs";
import { useEffect, useReducer, useRef, useState } from "react";
import { getOperationDetails } from "./helpers";
import { useWebSocketClient } from "./hooks";
import "./styles/App.css";
import { SharedDocument } from "./types";

function App() {
  const { addSubscriber } = useWebSocketClient();
  const [textContent, setTextContent] = useState<string>("Hello!");
  const textAreaRef = useRef<HTMLTextAreaElement>();
  const [localDocument, updateLocalDocument] = useReducer(
    localDocumentReducer,
    {
      textContent: "",
      userId: "",
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

  const getSharedDocument: messageCallbackType = (data) => {
    const sharedDocument = JSON.parse(data.body) as SharedDocument;
    console.log({ sharedDocument });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const operationDetails = getOperationDetails(textContent, e.target.value);
    console.log(operationDetails);
    setTextContent(e.target.value);
  };

  useEffect(() => {
    addSubscriber("/getSharedFile", getSharedDocument);
  }, []);

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <TextField
        id="outlined-multiline-static"
        label="Meu Doc Compartilhado"
        multiline
        rows={20}
        value={textContent}
        onChange={handleTextChange}
        fullWidth={true}
        inputRef={textAreaRef}
      />
    </Box>
  );
}

export default App;
