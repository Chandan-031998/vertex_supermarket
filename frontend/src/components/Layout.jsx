import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";
import Sidebar from "./layout/Sidebar";

export default function Layout({ title, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <Sidebar />

        <main className="p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 shadow-sm md:flex-row md:items-center md:justify-between" style={{ backgroundColor: settings.navbar_color }}>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">
                {settings.company_name} • Welcome back{user ? `, ${user.full_name || user.name}` : ""}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-700 shadow-sm border"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
