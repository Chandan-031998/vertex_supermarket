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

export default function Sidebar() {
  const location = useLocation();
  const { hasPermission, canAny } = useAuth();
  const { settings } = useAppSettings();
  const visibleItems = navItems.filter((item) =>
    Array.isArray(item.permission) ? canAny(item.permission) : hasPermission(item.permission)
  );

  return (
    <aside className="hidden md:block p-5 text-white" style={{ backgroundColor: settings.sidebar_color }}>
      <div className="mb-8 flex items-center gap-3">
        {settings.logo_path ? <img src={settings.logo_path} alt={settings.app_name} className="h-10 w-10 rounded-xl object-cover bg-white/10 p-1" /> : null}
        {settings.show_logo_text ? (
          <div>
            <h1 className="text-xl font-bold">{settings.app_heading}</h1>
            <p className="mt-1 text-sm text-slate-300">{settings.app_tagline}</p>
          </div>
        ) : null}
      </div>
      <nav className="space-y-2">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              location.pathname === to ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
