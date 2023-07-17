import { Box, Button, TextField } from "@mui/material";
import "./App.css";
import { useRef, useState } from "react";

function App() {
  const [textContent, setTextContent] = useState<string>("12345678");
  const textAreaRef = useRef<HTMLTextAreaElement>();

  const logSelectionRange = () => {
    const start = textAreaRef.current?.selectionStart;
    const end = textAreaRef.current?.selectionEnd;
    const textContentArray = textContent.split("");

    console.log({
      selectionStartRef: start,
      selectionEndRef: end,
      textContentArray,
    });
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <TextField
        id="outlined-multiline-static"
        label="Meu Doc Compartilhado"
        multiline
        rows={20}
        value={textContent}
        onChange={(e) => {
          logSelectionRange();
          setTextContent(e.target.value);
        }}
        fullWidth={true}
        inputRef={textAreaRef}
        onFocus={logSelectionRange}
      />

      <Box mt={4}>
        <Button variant="contained" onClick={logSelectionRange}>
          Log!
        </Button>
      </Box>
    </Box>
  );
}

export default App;
