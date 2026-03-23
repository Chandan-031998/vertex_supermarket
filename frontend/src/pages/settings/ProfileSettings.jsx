import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";

const defaultPassword = { current_password: "", new_password: "", confirm_password: "" };

export default function ProfileSettings() {
  const { refreshUser } = useAuth();
  const [passwordForm, setPasswordForm] = useState(defaultPassword);

  const { data: profile, refetch } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => (await api.get("/settings/profile")).data.data,
  });

  const [form, setForm] = useState(null);

  const updateProfile = useMutation({
    mutationFn: async (payload) => (await api.put("/settings/profile", payload)).data.data,
    onSuccess: async () => {
      await refetch();
      await refreshUser();
    },
  });

  const changePassword = useMutation({
    mutationFn: async (payload) => (await api.put("/settings/profile/password", payload)).data.data,
    onSuccess: () => setPasswordForm(defaultPassword),
  });

  const state = form || profile || {
    full_name: "",
    email: "",
    phone: "",
    profile_image: "",
    notification_preferences: { email: true, system: true, billing: true },
  };

  return (
    <Layout title="Profile Settings">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">My Profile</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              updateProfile.mutate(state);
            }}
          >
            <input className="input" placeholder="Full name" value={state.full_name} onChange={(event) => setForm((current) => ({ ...(current || state), full_name: event.target.value }))} />
            <input className="input" placeholder="Email" value={state.email} onChange={(event) => setForm((current) => ({ ...(current || state), email: event.target.value }))} />
            <input className="input" placeholder="Phone" value={state.phone || ""} onChange={(event) => setForm((current) => ({ ...(current || state), phone: event.target.value }))} />
            <input className="input" placeholder="Profile image URL" value={state.profile_image || ""} onChange={(event) => setForm((current) => ({ ...(current || state), profile_image: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-3">
              {["email", "system", "billing"].map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(state.notification_preferences?.[key])}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...(current || state),
                        notification_preferences: {
                          ...(state.notification_preferences || {}),
                          [key]: event.target.checked,
                        },
                      }))
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
            <button className="btn-primary w-full">{updateProfile.isPending ? "Saving..." : "Save Profile"}</button>
          </form>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (passwordForm.new_password !== passwordForm.confirm_password) {
                return;
              }
              changePassword.mutate(passwordForm);
            }}
          >
            <input className="input" type="password" placeholder="Current password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} />
            <input className="input" type="password" placeholder="New password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} />
            <input className="input" type="password" placeholder="Confirm new password" value={passwordForm.confirm_password} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))} />
            <button className="btn-primary w-full">{changePassword.isPending ? "Updating..." : "Update Password"}</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
