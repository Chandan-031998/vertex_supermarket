import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const defaultRoleForm = { name: "", description: "" };
const defaultUserForm = { full_name: "", email: "", phone: "", password: "", role_id: "", status: "active" };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [roleForm, setRoleForm] = useState(defaultRoleForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const canCreateRole = hasPermission("roles.add");
  const canCreateUser = hasPermission("users.add");

  const { data } = useQuery({
    queryKey: ["staff-bootstrap"],
    queryFn: async () => (await api.get("/staff/bootstrap")).data.data,
  });

  const createRole = useMutation({
    mutationFn: async (payload) => (await api.post("/staff/roles", payload)).data.data,
    onSuccess: () => {
      setRoleForm(defaultRoleForm);
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload) => (await api.post("/staff/users", payload)).data.data,
    onSuccess: () => {
      setUserForm(defaultUserForm);
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  const toggleShift = useMutation({
    mutationFn: async (payload) => (await api.post("/staff/shifts", payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  return (
    <Layout title="Staff & Roles">
      <div className="grid gap-6 xl:grid-cols-2">
        {canCreateRole ? <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Create Role</h3>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              createRole.mutate(roleForm);
            }}
          >
            <input className="input" placeholder="Role name" value={roleForm.name} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="input" placeholder="Description" value={roleForm.description} onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))} />
            <button className="btn-primary">{createRole.isPending ? "Saving..." : "Save Role"}</button>
          </form>
        </div> : null}

        {canCreateUser ? <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Create User</h3>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate({ ...userForm, role_id: Number(userForm.role_id) });
            }}
          >
            <input className="input" placeholder="Full name" value={userForm.full_name} onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))} />
            <input className="input" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
            <input className="input" placeholder="Phone" value={userForm.phone} onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="input" type="password" placeholder="Password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
            <select className="input" value={userForm.role_id} onChange={(event) => setUserForm((current) => ({ ...current, role_id: event.target.value }))}>
              <option value="">Select role</option>
              {(data?.roles ?? []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button className="btn-primary">{createUser.isPending ? "Saving..." : "Save User"}</button>
          </form>
        </div> : null}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="btn-primary" onClick={() => toggleShift.mutate({ action: "start" })}>
          Start Shift
        </button>
        <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" onClick={() => toggleShift.mutate({ action: "end" })}>
          End Shift
        </button>
      </div>

      <div className="mt-6 grid gap-6">
        <TableCard title="Users">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{row.full_name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.role}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Audit Logs">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {(data?.audit_logs ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.user_name || "-"}</td>
                  <td className="px-4 py-3">{row.action}</td>
                  <td className="px-4 py-3">{row.module}</td>
                  <td className="px-4 py-3">{row.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </Layout>
  );
}
