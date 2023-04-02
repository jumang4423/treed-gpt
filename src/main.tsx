import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { lightGreen, yellow } from "@mui/material/colors";

const switchTheme = createTheme({
  palette: {
    primary: {
      main: lightGreen[500],
    },
    secondary: {
      main: yellow[500],
    },
  },
  typography: {
    allVariants: {
      fontFamily: "Iosevka",
      textTransform: "none",
      fontSize: 16,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={switchTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
