import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { realApi } from "./lib/api";
import "./styles.css";
async function start() {
  const preview =
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("preview") === "1"
      ? await import("./lib/preview")
      : null;
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App
        api={preview?.previewApi ?? realApi}
        previewControls={preview?.previewControls}
      />
    </React.StrictMode>,
  );
}
void start();
