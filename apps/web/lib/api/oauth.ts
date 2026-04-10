import { apiFetch, type HttpResult } from "@/lib/http";

type OAuthResult = {
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    fullName: string | null;
  };
  accessToken: string;
  isNewUser: boolean;
};

export function googleLogin(
  credential: string,
  role?: string,
): Promise<HttpResult<OAuthResult>> {
  return apiFetch("/auth/oauth/google", {
    method: "POST",
    body: { credential, role },
  });
}

