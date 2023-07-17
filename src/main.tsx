import React from "react";
import ReactDOM from "react-dom/client";
import Auth from "./Auth";
import "./index.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { RecoilRoot } from "recoil";
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
  <RecoilRoot>
    <ThemeProvider theme={switchTheme}>
      <link
        href="https://pvinis.github.io/iosevka-webfont/3.4.1/iosevka.css"
        rel="stylesheet"
      />
      <Auth />
    </ThemeProvider>
  </RecoilRoot>
);
