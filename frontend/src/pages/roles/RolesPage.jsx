import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";
import { useAuth } from "../../context/AuthContext";

const emptyForm = { id: null, name: "", description: "", status: "active" };

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [assignment, setAssignment] = useState({ roleId: "", userId: "" });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles")).data.data,
  });

  const { data: users } = useQuery({
    queryKey: ["staff-bootstrap"],
    queryFn: async () => (await api.get("/staff/bootstrap")).data.data,
  });

  const saveRole = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/roles/${payload.id}`, payload)).data.data : (await api.post("/roles", payload)).data.data,
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  const assignRole = useMutation({
    mutationFn: async (payload) => (await api.post(`/roles/${payload.roleId}/assign-user`, { user_id: Number(payload.userId) })).data.data,
    onSuccess: () => {
      setAssignment({ roleId: "", userId: "" });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["staff-bootstrap"] });
    },
  });

  return (
    <Layout title="Role Management">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Role" : "Create Role"}</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveRole.mutate(form);
              }}
            >
              <input className="input" placeholder="Role name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <textarea className="input min-h-24" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex gap-3">
                <button className="btn-primary flex-1">{saveRole.isPending ? "Saving..." : form.id ? "Update Role" : "Save Role"}</button>
                {form.id ? (
                  <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setForm(emptyForm)}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Assign User to Role</h3>
            <div className="mt-4 space-y-3">
              <select className="input" value={assignment.roleId} onChange={(event) => setAssignment((current) => ({ ...current, roleId: event.target.value }))}>
                <option value="">Select role</option>
                {(roles ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select className="input" value={assignment.userId} onChange={(event) => setAssignment((current) => ({ ...current, userId: event.target.value }))}>
                <option value="">Select user</option>
                {(users?.users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              <button className="btn-primary w-full" onClick={() => assignRole.mutate(assignment)}>
                Assign Role
              </button>
            </div>
          </div>
        </div>

        <TableCard title="Roles">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(roles ?? []).map((role) => (
                <tr key={role.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{role.name}</div>
                    <div className="text-xs text-slate-500">{role.description || "No description"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{role.status || "active"}</td>
                  <td className="px-4 py-3">{role.user_count}</td>
                  <td className="px-4 py-3">{role.permission_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      {hasPermission("roles.edit") ? <button className="text-emerald-600" onClick={() => setForm(role)}>Edit</button> : null}
                      {hasPermission("roles.permissions") ? <Link className="text-slate-700" to={`/roles/${role.id}/permissions`}>Permissions</Link> : null}
                      {hasPermission("roles.delete") ? (
                        <button
                          className="text-rose-600"
                          onClick={() => {
                            if (window.confirm(`Delete role ${role.name}?`)) {
                              deleteRole.mutate(role.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </Layout>
  );
}
