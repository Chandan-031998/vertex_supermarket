import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";

export default function RolePermissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ["role-permissions", id],
    queryFn: async () => (await api.get(`/roles/${id}/permissions`)).data.data,
    onSuccess: (response) => setSelected(response.allowed_permissions || []),
  });

  const catalog = useMemo(() => data?.catalog ?? [], [data]);

  const savePermissions = useMutation({
    mutationFn: async () => (await api.put(`/roles/${id}/permissions`, { permission_keys: selected })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions", id] });
    },
  });

  function toggle(permissionKey) {
    setSelected((current) =>
      current.includes(permissionKey) ? current.filter((key) => key !== permissionKey) : [...current, permissionKey]
    );
  }

  return (
    <Layout title="Role Permissions">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{data?.role?.name || "Role"}</h3>
          <p className="text-sm text-slate-500">Configure visible pages and allowed actions for this role.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => navigate("/roles")}>
            Back
          </button>
          <button className="btn-primary" onClick={() => savePermissions.mutate()}>
            {savePermissions.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <TableCard title="Permission Matrix">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading permissions...</div>
        ) : (
          <div className="space-y-4">
            {catalog.map((module) => (
              <div key={module.module_name} className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">{module.module_name}</div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {module.permissions.map((permission) => (
                    <label key={permission.permission_key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={selected.includes(permission.permission_key)} onChange={() => toggle(permission.permission_key)} />
                      <div>
                        <div className="font-medium text-slate-900">{permission.permission_label}</div>
                        <div className="text-xs text-slate-500">{permission.permission_key}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </TableCard>
    </Layout>
  );
}
