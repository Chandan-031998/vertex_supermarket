import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AppSettingsContext = createContext(null);

const defaults = {
  app_name: "Vertex Supermarket",
  app_heading: "Vertex Supermarket",
  app_tagline: "Management System",
  company_name: "Vertex Supermarket",
  footer_text: "Vertex Supermarket ERP",
  login_title: "Vertex Supermarket",
  login_subtitle: "Login to manage billing, products, inventory, and reports.",
  logo_path: "",
  favicon_path: "",
  login_bg_path: "",
  primary_color: "#059669",
  sidebar_color: "#0f172a",
  navbar_color: "#ffffff",
  button_color: "#059669",
  card_accent_color: "#10b981",
  theme_mode: "light",
  sidebar_collapsed: 0,
  show_logo_text: 1,
  compact_mode: 0,
  table_density: "comfortable",
  border_radius: "xl",
};

function radiusValue(radius) {
  switch (radius) {
    case "none":
      return "0px";
    case "sm":
      return "8px";
    case "md":
      return "12px";
    case "lg":
      return "16px";
    default:
      return "20px";
  }
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    setLoading(true);
    try {
      const response = await api.get("/settings/public");
      setSettings({ ...defaults, ...response.data.data });
    } catch (error) {
      setSettings(defaults);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", settings.primary_color);
    root.style.setProperty("--color-sidebar", settings.sidebar_color);
    root.style.setProperty("--color-navbar", settings.navbar_color);
    root.style.setProperty("--color-button", settings.button_color);
    root.style.setProperty("--color-card-accent", settings.card_accent_color);
    root.style.setProperty("--radius-base", radiusValue(settings.border_radius));
    root.dataset.theme = settings.theme_mode || "light";

    if (settings.favicon_path) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_path;
    }

    document.title = settings.app_name || defaults.app_name;
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
    }),
    [settings, loading]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
