import { redirect } from "next/navigation";
import { safeNextPath } from "@/components/auth/authFlow";

// Public adapter — not inside the protected (portal)/vendor/ layout so no
// RequireAuth guard wraps it. Forwards to the shared premium login UI with
// the vendor role pre-selected and a safe post-login destination.
export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNextPath(next ?? null, "/vendor");
  redirect(`/login?role=vendor&next=${encodeURIComponent(destination)}`);
}
