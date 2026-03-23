import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import Layout from "../../components/Layout";
import { useAppSettings } from "../../context/AppSettingsContext";

export default function AppCustomization() {
  const { refreshSettings } = useAppSettings();
  const { data } = useQuery({
    queryKey: ["app-customization"],
    queryFn: async () => (await api.get("/settings/app")).data.data,
  });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: async (payload) => (await api.put("/settings/app", payload)).data.data,
    onSuccess: async () => {
      await refreshSettings();
    },
  });

  if (!form) {
    return (
      <Layout title="App Customization">
        <div className="card p-6 text-sm text-slate-500">Loading customization settings...</div>
      </Layout>
    );
  }

  return (
    <Layout title="App Customization">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["app_name", "App name"],
              ["app_heading", "App heading"],
              ["app_tagline", "App tagline"],
              ["company_name", "Company name"],
              ["footer_text", "Footer text"],
              ["login_title", "Login title"],
              ["login_subtitle", "Login subtitle"],
              ["logo_path", "Logo URL"],
              ["favicon_path", "Favicon URL"],
              ["login_bg_path", "Login background URL"],
            ].map(([key, label]) => (
              <input key={key} className="input" placeholder={label} value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Theme & Layout</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["primary_color", "Primary color"],
              ["sidebar_color", "Sidebar color"],
              ["navbar_color", "Navbar color"],
              ["button_color", "Button color"],
              ["card_accent_color", "Card accent color"],
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm">
                <span className="text-slate-600">{label}</span>
                <input className="input h-11" type="color" value={form[key] || "#000000"} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
            <select className="input" value={form.theme_mode} onChange={(event) => setForm((current) => ({ ...current, theme_mode: event.target.value }))}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <select className="input" value={form.table_density} onChange={(event) => setForm((current) => ({ ...current, table_density: event.target.value }))}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
            <select className="input" value={form.border_radius} onChange={(event) => setForm((current) => ({ ...current, border_radius: event.target.value }))}>
              <option value="sm">Small Radius</option>
              <option value="md">Medium Radius</option>
              <option value="lg">Large Radius</option>
              <option value="xl">Extra Large Radius</option>
            </select>
            {[
              ["sidebar_collapsed", "Sidebar collapsed by default"],
              ["show_logo_text", "Show logo text"],
              ["compact_mode", "Compact mode"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked ? 1 : 0 }))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={() => saveSettings.mutate(form)}>
          {saveSettings.isPending ? "Saving..." : "Save Customization"}
        </button>
      </div>
    </Layout>
  );
}
