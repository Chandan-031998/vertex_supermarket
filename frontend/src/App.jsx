import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import PurchasesPage from "./pages/PurchasesPage";
import CustomersPage from "./pages/CustomersPage";
import SuppliersPage from "./pages/SuppliersPage";
import ReportsPage from "./pages/ReportsPage";
import AccountingPage from "./pages/AccountingPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/roles/RolesPage";
import RolePermissionsPage from "./pages/roles/RolePermissionsPage";
import ProfileSettings from "./pages/settings/ProfileSettings";
import AppCustomization from "./pages/settings/AppCustomization";
import PrivateRoute from "./routes/PrivateRoute";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute permission="dashboard.view"><DashboardPage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute permission="products.view"><ProductsPage /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute permission="categories.view"><CategoriesPage /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute permission="inventory.view"><InventoryPage /></PrivateRoute>} />
        <Route path="/sales" element={<PrivateRoute permission="pos.view"><SalesPage /></PrivateRoute>} />
        <Route path="/purchases" element={<PrivateRoute permission="purchases.view"><PurchasesPage /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute permission="customers.view"><CustomersPage /></PrivateRoute>} />
        <Route path="/suppliers" element={<PrivateRoute permission="suppliers.view"><SuppliersPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute permission={["reports.sales", "reports.gst", "reports.pnl", "reports.purchases"]}><ReportsPage /></PrivateRoute>} />
        <Route path="/accounting" element={<PrivateRoute permission={["expenses.view", "reports.pnl"]}><AccountingPage /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute permission="users.view"><UsersPage /></PrivateRoute>} />
        <Route path="/roles" element={<PrivateRoute permission="roles.view"><RolesPage /></PrivateRoute>} />
        <Route path="/roles/:id/permissions" element={<PrivateRoute permission="roles.permissions"><RolePermissionsPage /></PrivateRoute>} />
        <Route path="/settings/profile" element={<PrivateRoute permission="profile.view"><ProfileSettings /></PrivateRoute>} />
        <Route path="/settings/customization" element={<PrivateRoute permission="customization.view"><AppCustomization /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}
