"use client";

import { useEffect } from "react";

/**
 * Google OAuth callback page.
 *
 * Google redirects here after the user picks an account in the popup.
 * The ID token is in the URL hash (#id_token=...) — we extract it and
 * post it back to the parent window, then close the popup.
 *
 * This page should never be visible for more than a split second.
 */
export default function GoogleCallbackPage() {
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");
      const error = params.get("error");

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "google-oauth-callback", idToken, error },
          window.location.origin,
        );
      }
    } catch {
      // ignore — window may already be closing
    } finally {
      window.close();
    }
  }, []);

  return (
    <div className="grid h-screen w-screen place-items-center bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        <p className="text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}
