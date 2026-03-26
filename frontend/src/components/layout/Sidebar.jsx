import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Calculator,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppSettings } from "../../context/AppSettingsContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "/products", label: "Products", icon: Package, permission: "products.view" },
  { to: "/categories", label: "Categories & Brands", icon: Tags, permission: "categories.view" },
  { to: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory.view" },
  { to: "/sales", label: "Sales / POS", icon: ShoppingCart, permission: "pos.view" },
  { to: "/purchases", label: "Purchases", icon: Receipt, permission: "purchases.view" },
  { to: "/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers.view" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: ["reports.sales", "reports.gst", "reports.pnl", "reports.purchases"] },
  { to: "/accounting", label: "Accounting", icon: Calculator, permission: ["expenses.view", "reports.pnl"] },
  { to: "/roles", label: "Roles", icon: ShieldCheck, permission: "roles.view" },
  { to: "/users", label: "Users", icon: Users, permission: "users.view" },
  { to: "/settings/profile", label: "Profile", icon: UserCircle2, permission: "profile.view" },
  { to: "/settings/customization", label: "Customization", icon: Settings, permission: "customization.view" },
];

function SidebarNav({ onNavigate }) {
  const location = useLocation();
  const { hasPermission, canAny } = useAuth();
  const visibleItems = navItems.filter((item) =>
    Array.isArray(item.permission) ? canAny(item.permission) : hasPermission(item.permission)
  );

  return (
    <nav className="space-y-2">
      {visibleItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
            location.pathname === to || location.pathname.startsWith(`${to}/`)
              ? "bg-white/15 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { settings } = useAppSettings();

  return (
    <>
      <aside
        className="relative hidden min-h-screen overflow-hidden border-r border-slate-800/60 p-5 text-white md:block"
        style={{ backgroundColor: settings.sidebar_color }}
      >
        <div className="pointer-events-none absolute -left-12 -top-8 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-10 h-36 w-36 rounded-full bg-sky-400/20 blur-2xl" />

        <div className="relative z-10 mb-8 flex items-center gap-3">
          {settings.logo_path ? <img src={settings.logo_path} alt={settings.app_name} className="h-10 w-10 rounded-xl object-cover bg-white/10 p-1" /> : null}
          {settings.show_logo_text ? (
            <div>
              <h1 className="text-xl font-bold">{settings.app_heading}</h1>
              <p className="mt-1 text-sm text-slate-300">{settings.app_tagline}</p>
            </div>
          ) : null}
        </div>
        <div className="relative z-10 max-h-[calc(100vh-6.5rem)] overflow-y-auto pr-1">
          <SidebarNav />
        </div>
      </aside>

      {mobileOpen ? <button type="button" className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" onClick={onClose} aria-label="Close menu" /> : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform overflow-hidden border-r border-slate-800/60 p-5 text-white transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: settings.sidebar_color }}
      >
        <div className="pointer-events-none absolute -left-12 -top-8 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl" />

        <div className="relative z-10 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_path ? <img src={settings.logo_path} alt={settings.app_name} className="h-10 w-10 rounded-xl object-cover bg-white/10 p-1" /> : null}
            <div>
              <h1 className="text-lg font-bold">{settings.app_heading}</h1>
              <p className="mt-0.5 text-xs text-slate-300">{settings.app_tagline}</p>
            </div>
          </div>
          <button type="button" className="rounded-lg p-1 text-slate-200 hover:bg-white/10" onClick={onClose} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>
        <div className="relative z-10 max-h-[calc(100vh-6.5rem)] overflow-y-auto pr-1">
          <SidebarNav onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
