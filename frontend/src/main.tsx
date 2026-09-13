import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./styles/app.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("The #root element is missing from the page shell.");
}

createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
