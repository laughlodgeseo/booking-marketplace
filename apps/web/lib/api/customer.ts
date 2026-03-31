import { apiFetch, type HttpResult } from "@/lib/http";

export type CustomerProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  authProvider: string | null;
  isEmailVerified: boolean;
  createdAt: string;
};

export function getCustomerProfile(): Promise<HttpResult<CustomerProfile>> {
  return apiFetch("/customer/profile");
}

export function updateCustomerProfile(data: {
  fullName?: string;
  phone?: string;
}): Promise<HttpResult<CustomerProfile>> {
  return apiFetch("/customer/profile", {
    method: "PATCH",
    body: data,
  });
}

export async function uploadAvatar(file: File): Promise<HttpResult<{ id: string; avatarUrl: string }>> {
  const formData = new FormData();
  formData.append("file", file);

  // Use raw fetch for multipart — apiFetch sets Content-Type to JSON
  const { getAccessToken } = await import("@/lib/auth/tokenStore");
  const { apiUrl } = await import("@/lib/api/base");

  const token = getAccessToken();
  const res = await fetch(apiUrl("/customer/profile/avatar"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include",
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: payload?.message || `Upload failed (${res.status})`,
    };
  }

  return { ok: true, status: res.status, data: payload };
}
