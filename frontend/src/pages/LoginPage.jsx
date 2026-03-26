import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-4"
      style={settings.login_bg_path ? { backgroundImage: `linear-gradient(rgba(15,23,42,0.35), rgba(15,23,42,0.35)), url(${settings.login_bg_path})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {!settings.login_bg_path ? (
        <>
          <div className="pointer-events-none absolute -left-16 top-16 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        </>
      ) : null}

      <div className="w-full max-w-md card p-6 sm:p-8">
        {settings.logo_path ? <img src={settings.logo_path} alt={settings.app_name} className="mb-4 h-14 w-14 rounded-2xl object-cover ring-4 ring-emerald-50" /> : null}
        <h1 className="text-2xl font-bold text-slate-900">{settings.login_title}</h1>
        <p className="mt-2 text-sm text-slate-500">{settings.login_subtitle}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="input"
              name="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="input"
              name="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button className="btn-primary w-full">Sign In</button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-500">{settings.footer_text}</div>
      </div>
    </div>
  );
}
