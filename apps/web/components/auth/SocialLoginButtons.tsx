"use client";

import { useEffect, useRef, useState } from "react";

type SocialLoginButtonsProps = {
  onGoogleLogin: (credential: string) => Promise<void>;
  disabled?: boolean;
};

type GoogleCredentialResponse = { credential: string };

type GoogleWindow = typeof window & {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            type?: "standard" | "icon";
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill" | "circle" | "square";
            width?: number;
          },
        ) => void;
      };
    };
  };
};

export function SocialLoginButtons({
  onGoogleLogin,
  disabled = false,
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Off-screen div that holds Google's real rendered button
  const hiddenRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref to the callback so we don't re-run the init effect
  const callbackRef = useRef(onGoogleLogin);
  useEffect(() => {
    callbackRef.current = onGoogleLogin;
  }, [onGoogleLogin]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    if (!clientId) {
      setInitError("Google Client ID is not configured.");
      return;
    }

    const init = (): boolean => {
      const gsi = (window as GoogleWindow).google?.accounts?.id;
      if (!gsi || !hiddenRef.current) return false;

      gsi.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: GoogleCredentialResponse) => {
          if (!response.credential) {
            setLoading(false);
            return;
          }
          setLoginError(null);
          try {
            await callbackRef.current(response.credential);
          } catch (err) {
            setLoginError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
            setLoading(false);
          }
        },
      });

      // Render Google's real button (off-screen). This is what opens
      // the proper Google account-selector popup when triggered.
      gsi.renderButton(hiddenRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
      });

      setReady(true);
      return true;
    };

    // GSI script loads asynchronously — poll until it's ready
    if (!init()) {
      const interval = setInterval(() => {
        if (init()) clearInterval(interval);
      }, 200);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!ready) setInitError("Google Sign In failed to load. Please refresh.");
      }, 10_000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleClick = () => {
    if (disabled || loading) return;
    setLoginError(null);

    // Trigger Google's rendered button — opens the proper popup
    const btn = hiddenRef.current?.querySelector<HTMLElement>("[role='button']");
    if (btn) {
      setLoading(true);
      btn.click();
    } else {
      setLoginError("Google Sign In is still loading. Please try again in a moment.");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/*
        Off-screen container for the GSI-rendered button.
        Must NOT use display:none or visibility:hidden — Google's script
        needs the element to be technically visible to render into it.
      */}
      <div
        ref={hiddenRef}
        aria-hidden="true"
        style={{ position: "fixed", top: 0, left: "-9999px", width: "250px", height: "50px" }}
      />

      {/* Our styled "Continue with Google" button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading || Boolean(initError)}
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
        {/* Icon or spinner */}
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

        {/* Subtle right-arrow that fades in on hover */}
        <span className="absolute right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-indigo-400 text-xs">
          →
        </span>
      </button>

      {/* Error states */}
      {(loginError ?? initError) && (
        <p className="text-center text-xs text-rose-600">
          {loginError ?? initError}
        </p>
      )}
    </div>
  );
}
