"use client";

import { useEffect, useState, useCallback } from "react";
import { User, Camera, Loader2, Check } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useAuth } from "@/lib/auth/auth-context";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getCustomerProfile,
  updateCustomerProfile,
  uploadAvatar,
  type CustomerProfile,
} from "@/lib/api/customer";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; profile: CustomerProfile };

export default function ProfilePage() {
  const { status, refresh } = useAuth();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const res = await getCustomerProfile();
    if (res.ok) {
      setState({ kind: "ready", profile: res.data });
      setFullName(res.data.fullName ?? "");
      setPhone(res.data.phone ?? "");
    } else {
      setState({ kind: "error", message: res.message ?? "Failed to load profile" });
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    void load();
  }, [status, load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const res = await updateCustomerProfile({
      fullName: fullName.trim() || undefined,
      phone: phone.trim() || undefined,
    });

    setSaving(false);

    if (res.ok) {
      setState({ kind: "ready", profile: res.data });
      setSaved(true);
      void refresh();
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(res.message ?? "Failed to update profile");
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveError("File size must be under 5 MB");
      return;
    }

    setUploading(true);
    setSaveError(null);

    const res = await uploadAvatar(file);
    setUploading(false);

    if (res.ok) {
      void load();
      void refresh();
    } else {
      setSaveError(res.message ?? "Upload failed");
    }
  }

  if (state.kind === "loading") {
    return (
      <PortalShell role="customer" title="Profile" subtitle="Manage your personal information">
        <div className="premium-card premium-card-tinted rounded-2xl p-6 text-sm text-secondary">
          Loading profile...
        </div>
      </PortalShell>
    );
  }

  if (state.kind === "error") {
    return (
      <PortalShell role="customer" title="Profile" subtitle="Manage your personal information">
        <div className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">Error</div>
          <div className="mt-2 text-sm text-secondary">{state.message}</div>
        </div>
      </PortalShell>
    );
  }

  const { profile } = state;

  return (
    <PortalShell role="customer" title="Profile" subtitle="Manage your personal information">
      <div className="space-y-6">
        {/* Avatar section */}
        <div className="premium-card premium-card-dark rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.avatarUrl ? (
                <OptimizedImage
                  src={profile.avatarUrl}
                  alt="Avatar"
                  width={128}
                  height={128}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-line"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft ring-2 ring-line">
                  <User className="h-8 w-8 text-secondary" />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand text-accent-text shadow-md transition hover:bg-brand-hover">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">
                {profile.fullName || profile.email}
              </div>
              <div className="mt-1 text-sm text-secondary">{profile.email}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {profile.isEmailVerified ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-700">Email verified</span>
                  </>
                ) : (
                  <span className="text-amber-600">Email not verified</span>
                )}
              </div>
              {profile.authProvider && (
                <div className="mt-1 text-xs text-muted capitalize">
                  Linked via {profile.authProvider}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">Personal information</div>
          <p className="mt-1 text-xs text-secondary">
            Update your name and contact details.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Full name
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Email
            </span>
            <input
              type="email"
              value={profile.email}
              disabled
              className="h-11 w-full rounded-xl border border-line bg-warm-alt px-3 text-sm text-secondary outline-none"
            />
          </label>

          {saveError && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {saveError}
            </p>
          )}

          {saved && (
            <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Profile updated successfully.
            </p>
          )}

          <div className="mt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text transition hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>

        {/* Account info */}
        <div className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">Account details</div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted">Account ID</span>
              <div className="mt-0.5 font-mono text-xs text-secondary">{profile.id}</div>
            </div>
            <div>
              <span className="text-xs text-muted">Member since</span>
              <div className="mt-0.5 text-xs text-secondary">
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
