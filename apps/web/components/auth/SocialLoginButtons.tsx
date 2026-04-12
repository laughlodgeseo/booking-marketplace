"use client";

import { useRef, useState } from "react";

type SocialLoginButtonsProps = {
  onGoogleLogin: (credential: string) => Promise<void>;
  disabled?: boolean;
};

type OAuthMessage = {
  type: "google-oauth-callback";
  idToken: string | null;
  error: string | null;
};

export function SocialLoginButtons({
  onGoogleLogin,
  disabled = false,
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleClick = () => {
    if (disabled || loading) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Sign In is not configured.");
      return;
    }

    // Clean up any previous listener
    cleanupRef.current?.();
    cleanupRef.current = null;
    setError(null);

    // Build the Google OAuth URL — opens the proper account-selector popup
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      prompt: "select_account",
    });

    const w = 500;
    const h = 620;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no`;

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "google-signin",
      features,
    );

    if (!popup || popup.closed) {
      setError("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    setLoading(true);

    // Listen for the token posted back from /auth/google/callback
    const handleMessage = (event: MessageEvent<OAuthMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google-oauth-callback") return;

      cleanup();

      if (event.data.error) {
        setError("Google sign in was cancelled.");
        setLoading(false);
        return;
      }

      if (!event.data.idToken) {
        setError("No credential returned by Google. Please try again.");
        setLoading(false);
        return;
      }

      onGoogleLogin(event.data.idToken)
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
        })
        .finally(() => setLoading(false));
    };

    window.addEventListener("message", handleMessage);

    // Also clean up if the user just closes the popup without signing in
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        setLoading(false);
      }
    }, 500);

    function cleanup() {
      clearInterval(pollClosed);
      window.removeEventListener("message", handleMessage);
      cleanupRef.current = null;
    }

    cleanupRef.current = cleanup;
  };

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={[
          "group relative flex w-full items-center justify-center gap-3",
          "rounded-xl border px-4 py-3",
          "text-sm font-semibold text-slate-700",
          "bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
          "border-slate-200/90",
          "transition-all duration-200 ease-out",
          "hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-[0_4px_16px_rgba(99,102,241,0.14)] hover:-translate-y-[2px]",
          "active:translate-y-0 active:shadow-[0_1px_4px_rgba(15,23,42,0.08)] active:bg-indigo-50/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
        ].join(" ")}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {loading ? (
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 18 18"
              fill="none"
              className="transition-transform duration-200 group-hover:scale-110"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
          )}
        </span>

        <span className="transition-colors duration-150 group-hover:text-indigo-800">
          {loading ? "Signing in…" : "Continue with Google"}
        </span>

        <span className="absolute right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-indigo-400 text-xs">
          →
        </span>
      </button>

      {error && (
        <p className="text-center text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
