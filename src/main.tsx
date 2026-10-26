import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { realApi } from "./lib/api";
import "./styles.css";
import { I18nProvider } from "./lib/i18n";
async function start() {
  const preview =
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("preview") === "1"
      ? await import("./lib/preview")
      : null;
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <I18nProvider api={preview?.previewApi ?? realApi}>
        <App
          api={preview?.previewApi ?? realApi}
          previewControls={preview?.previewControls}
        />
      </I18nProvider>
    </React.StrictMode>,
  );
}
void start();
