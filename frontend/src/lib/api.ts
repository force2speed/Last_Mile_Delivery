// src/lib/api.ts — Axios API client with JWT auto-attach
import axios, { AxiosError } from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lmd_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("lmd_token");
      localStorage.removeItem("lmd_user");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const authApi = {
  login:       (data: { email: string; password: string }) => api.post("/auth/login", data),
  googleLogin: (token: string)                             => api.post("/auth/google", { token }),
  register:    (data: Record<string, string>)              => api.post("/auth/register", data),
  me:          ()                                          => api.get("/auth/me"),
  updateMe:    (data: unknown)                             => api.patch("/auth/me", data),
};

export const ordersApi = {
  create:       (data: unknown)            => api.post("/orders", data),
  list:         (params?: unknown)         => api.get("/orders", { params }),
  getById:      (id: string)               => api.get(`/orders/${id}`),
  updateStatus: (id: string, data: unknown)=> api.patch(`/orders/${id}/status`, data),
  trackPublic:  (orderNumber: string)      => api.get(`/orders/track/${orderNumber}`),
  getTracking:  (id: string)               => api.get(`/orders/${id}/tracking`),
  pay:          (id: string)               => api.post(`/orders/${id}/pay`),
};

export const rateApi = {
  calculate: (data: unknown) => api.post("/rate/calculate", data),
};

export const agentsApi = {
  list:           ()             => api.get("/agents"),
  myOrders:       ()             => api.get("/agents/me/orders"),
  updateLocation: (data: unknown)=> api.patch("/agents/me/location", data),
  updateStatus:   (data: unknown)=> api.patch("/agents/me/status", data),
};

export const adminApi = {
  dashboard:      ()             => api.get("/admin/dashboard"),
  reports:        ()             => api.get("/admin/reports"),
  users:          (params?: unknown) => api.get("/admin/users", { params }),
  createUser:     (data: unknown) => api.post("/admin/users", data),
  updateUserStatus:(userId: string, data: { isActive: boolean }) => api.patch(`/admin/users/${userId}/status`, data),
  zones:          ()             => api.get("/admin/zones"),
  createZone:     (data: { name: string; code: string; description?: string }) => api.post("/admin/zones", data),
  createArea:     (zoneId: string, data: { name: string; pincode: string }) => api.post(`/admin/zones/${zoneId}/areas`, data),
  rateCards:      ()             => api.get("/admin/rate-cards"),
  createRateCard: (data: unknown)=> api.post("/admin/rate-cards", data),
};
