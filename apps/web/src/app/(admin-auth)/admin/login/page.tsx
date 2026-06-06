"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLoginPanel } from "@/components/auth/AdminLoginPanel";
import { AuthSplitScreen } from "@/components/auth/AuthSplitScreen";
import { safeAdminNextPath } from "@/components/auth/authFlow";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const nextPath = safeAdminNextPath(searchParams.get("next") ?? null);

  const panel = (
    <AdminLoginPanel nextPath={nextPath} />
  );

  return (
    <AuthSplitScreen
      panel="login"
      title="Admin portal sign in"
      subtitle="Secure access to marketplace operations, review queues, vendor controls, bookings, payments, and support workflows."
      panels={{ login: panel, signup: panel, forgot: panel }}
    />
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}
