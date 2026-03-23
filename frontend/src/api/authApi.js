import api from "./client";

export const loginUser = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};
