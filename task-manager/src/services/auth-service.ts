import apiClient from "@/lib/axios-client";
import type { AuthResponse, SafeUser } from "@/types/user";

export const authService = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  me: () =>
    apiClient.get<{ user: SafeUser }>("/auth/me").then((r) => r.data.user),

  logout: () =>
    apiClient.post("/auth/logout").then((r) => r.data),
};
