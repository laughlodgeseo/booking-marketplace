import "@/components/inside-story/story.css";
import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function HostOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth redirectTo="/login?next=%2Fvendor%2Fonboarding">
      <div className="inside-story story-onboarding">{children}</div>
    </RequireAuth>
  );
}
