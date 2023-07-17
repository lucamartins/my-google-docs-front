import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { muiThemeConfig } from "./mui/theme.ts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={muiThemeConfig}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
