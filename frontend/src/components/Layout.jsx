import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";
import Sidebar from "./layout/Sidebar";
import PageHeader from "./common/PageHeader";

export default function Layout({ title, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <main className="w-full p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1700px]">
            <div className="space-y-6">
              <PageHeader
                title={title}
                subtitle={`${settings.company_name} • Welcome back${user ? `, ${user.full_name || user.name}` : ""}`}
                onMenuClick={() => setMobileMenuOpen(true)}
                onLogout={() => {
                  logout();
                  navigate("/login");
                }}
              />
              <section className="page-enter">{children}</section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
