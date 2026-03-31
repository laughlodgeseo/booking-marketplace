"use client";

import { useState } from "react";

type SocialLoginButtonsProps = {
  onGoogleLogin: (credential: string) => Promise<void>;
  onAppleLogin: (idToken: string, fullName?: string) => Promise<void>;
  disabled?: boolean;
};

type GoogleNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
};

type GoogleWindow = typeof window & {
  google?: {
    accounts?: {
      id?: {
        prompt: (callback: (n: GoogleNotification) => void) => void;
      };
    };
  };
};

type AppleAuthResponse = {
  authorization?: { id_token?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
};

type AppleWindow = typeof window & {
  AppleID?: {
    auth?: {
      signIn: () => Promise<AppleAuthResponse>;
    };
  };
};

export function SocialLoginButtons({
  onGoogleLogin,
  onAppleLogin,
  disabled = false,
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const handleGoogle = async () => {
    if (loading || disabled) return;
    setLoading("google");
    try {
      // Use Google Identity Services (GSI) to get credential
      if (typeof window !== "undefined" && (window as GoogleWindow).google?.accounts?.id) {
        (window as GoogleWindow).google!.accounts!.id!.prompt(
          async (notification: GoogleNotification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              setLoading(null);
            }
          },
        );
        // The callback is set up in the parent via google.accounts.id.initialize
      } else {
        // Fallback: show a message
        console.warn("Google Identity Services not loaded");
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    if (loading || disabled) return;
    setLoading("apple");
    try {
      if (typeof window !== "undefined" && (window as AppleWindow).AppleID?.auth) {
        const response = await (window as AppleWindow).AppleID!.auth!.signIn();
        const idToken = response.authorization?.id_token;
        const fullName = response.user
          ? `${response.user.name?.firstName ?? ""} ${response.user.name?.lastName ?? ""}`.trim()
          : undefined;

        if (idToken) {
          await onAppleLogin(idToken, fullName);
        }
      } else {
        console.warn("Apple Sign In JS not loaded");
      }
    } catch {
      // User cancelled or error
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={disabled || loading !== null}
        className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {loading === "google" ? "Signing in..." : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={handleApple}
        disabled={disabled || loading !== null}
        className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-white bg-black hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 21" fill="currentColor">
          <path d="M14.94 11.117c-.024-2.605 2.125-3.858 2.221-3.918-1.21-1.769-3.092-2.012-3.763-2.04-1.602-.162-3.126.943-3.938.943-.812 0-2.068-.919-3.397-.895-1.748.026-3.358 1.016-4.258 2.581-1.816 3.15-.465 7.817 1.304 10.373.865 1.251 1.897 2.657 3.252 2.607 1.305-.053 1.798-.844 3.376-.844 1.577 0 2.021.844 3.399.818 1.404-.026 2.293-1.275 3.151-2.53.992-1.452 1.401-2.858 1.426-2.932-.031-.013-2.737-1.05-2.764-4.163zM12.348 3.375C13.073 2.496 13.563 1.3 13.432.1c-1.032.042-2.283.687-3.023 1.554-.663.768-1.243 1.995-1.088 3.172 1.152.09 2.327-.585 3.027-1.451z"/>
        </svg>
        {loading === "apple" ? "Signing in..." : "Continue with Apple"}
      </button>
    </div>
  );
}
