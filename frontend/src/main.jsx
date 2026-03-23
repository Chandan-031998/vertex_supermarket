import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppSettingsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppSettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
