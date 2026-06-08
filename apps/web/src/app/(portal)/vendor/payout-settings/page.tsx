"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Globe2, Landmark, Loader2, ShieldAlert, Trash2 } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  vendorCreatePayoutMethod,
  vendorDisablePayoutMethod,
  vendorListPayoutMethods,
  vendorSetDefaultPayoutMethod,
  type VendorPayoutMethodInput,
  type VendorPayoutMethodRow,
  type VendorPayoutMethodType,
} from "@/lib/api/portal/finance";

const METHOD_OPTIONS: Array<{ type: VendorPayoutMethodType; title: string; icon: React.ReactNode; desc: string }> = [
  { type: "UAE_BANK_TRANSFER", title: "UAE Bank Transfer", icon: <Landmark className="h-4 w-4" />, desc: "Recommended for UAE vendors with an AE IBAN." },
  { type: "INTERNATIONAL_BANK_TRANSFER", title: "International Transfer", icon: <Globe2 className="h-4 w-4" />, desc: "For non-UAE accounts with SWIFT/BIC details." },
  { type: "OTHER_MANUAL", title: "Other Manual Method", icon: <Building2 className="h-4 w-4" />, desc: "Requires admin review before use." },
];

function pretty(value: string): string {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initialForm(type: VendorPayoutMethodType): VendorPayoutMethodInput {
  return { type, currency: "AED", bankCountry: type === "UAE_BANK_TRANSFER" ? "UAE" : "" };
}

export default function VendorPayoutSettingsPage() {
  const [methods, setMethods] = useState<VendorPayoutMethodRow[]>([]);
  const [selected, setSelected] = useState<VendorPayoutMethodType>("UAE_BANK_TRANSFER");
  const [form, setForm] = useState<VendorPayoutMethodInput>(initialForm("UAE_BANK_TRANSFER"));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await vendorListPayoutMethods();
      setMethods(Array.isArray(res.items) ? res.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function update(key: keyof VendorPayoutMethodInput, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy("Saving payout method...");
    setMessage(null);
    try {
      await vendorCreatePayoutMethod({ ...form, type: selected });
      setMessage("Payout method saved for admin review.");
      setForm(initialForm(selected));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save payout method.");
    } finally {
      setBusy(null);
    }
  }

  async function setDefault(id: string) {
    setBusy(id);
    try {
      await vendorSetDefaultPayoutMethod(id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disable(id: string) {
    setBusy(id);
    try {
      await vendorDisablePayoutMethod(id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const selectedMeta = useMemo(() => METHOD_OPTIONS.find((o) => o.type === selected), [selected]);

  return (
    <PortalShell role="vendor" title="Payout Settings" subtitle="Secure payout details for vendor earnings">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line/70 bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">Add your payout details so Laugh & Lodge can transfer your booking earnings.</div>
              <p className="mt-1 text-sm text-secondary">Bank transfer is recommended. Details are reviewed before payouts and sensitive values are masked in lists.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {METHOD_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.type}
              onClick={() => {
                setSelected(option.type);
                setForm(initialForm(option.type));
              }}
              className={`rounded-2xl border p-4 text-left transition ${selected === option.type ? "border-brand bg-brand/8" : "border-line/70 bg-surface hover:border-brand/40"}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-brand">{option.icon}</span>
                {option.title}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-secondary">{option.desc}</p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-line/70 bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-primary">{selectedMeta?.title}</div>
              <div className="mt-1 text-xs text-muted">Use the account holder name exactly as it appears on your account.</div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-secondary">
              <input type="checkbox" checked={form.isDefault === true} onChange={(e) => update("isDefault", e.target.checked)} />
              Set as default
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selected !== "OTHER_MANUAL" ? (
              <>
                <Input label="Account holder name" value={form.accountHolderName ?? ""} onChange={(v) => update("accountHolderName", v)} />
                <Input label="Bank name" value={form.bankName ?? ""} onChange={(v) => update("bankName", v)} />
                <Input label={selected === "UAE_BANK_TRANSFER" ? "IBAN (AE, 23 characters)" : "IBAN"} value={form.iban ?? ""} onChange={(v) => update("iban", v)} />
                <Input label="Account number (optional)" value={form.accountNumber ?? ""} onChange={(v) => update("accountNumber", v)} />
                <Input label="SWIFT/BIC" value={form.swiftCode ?? ""} onChange={(v) => update("swiftCode", v)} />
                <Input label="Bank country" value={form.bankCountry ?? ""} onChange={(v) => update("bankCountry", v)} />
                <Input label="Bank city/branch" value={form.bankCity ?? ""} onChange={(v) => update("bankCity", v)} />
                <Input label="Currency" value={form.currency ?? "AED"} onChange={(v) => update("currency", v.toUpperCase())} />
                <Textarea label="Transfer reference/instructions" value={form.transferInstructions ?? ""} onChange={(v) => update("transferInstructions", v)} />
              </>
            ) : (
              <>
                <Input label="Method name" value={form.manualMethodLabel ?? ""} onChange={(v) => update("manualMethodLabel", v)} />
                <Input label="Recipient/account identifier" value={form.manualIdentifier ?? ""} onChange={(v) => update("manualIdentifier", v)} />
                <Input label="Contact detail" value={form.contactDetail ?? ""} onChange={(v) => update("contactDetail", v)} />
                <Input label="Currency" value={form.currency ?? "AED"} onChange={(v) => update("currency", v.toUpperCase())} />
                <Textarea label="Instructions" value={form.manualInstructions ?? ""} onChange={(v) => update("manualInstructions", v)} />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void save()} disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "Saving payout method..." ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save payout method
            </button>
            <div className="text-xs text-muted">UAE IBAN must start with AE and have 23 characters after spaces are removed.</div>
          </div>
          {message ? <div className="mt-3 rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div> : null}
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold text-primary">Saved payout methods</div>
          {loading ? (
            <div className="rounded-2xl border border-line/70 bg-surface p-5 text-sm text-secondary">Loading...</div>
          ) : methods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/70 bg-surface p-6 text-sm text-secondary">No payout details added yet.</div>
          ) : (
            methods.map((method) => (
              <article key={method.id} className="rounded-2xl border border-line/70 bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      {pretty(method.type)}
                      {method.isDefault ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand">Default</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {method.accountHolderName ?? method.manualMethodLabel ?? "Manual recipient"} · {method.bankName ?? method.manualIdentifier ?? "Admin review"}
                    </div>
                    <div className="mt-1 text-xs text-muted">IBAN {method.ibanMasked ?? "—"} · Account ending {method.accountNumberLast4 ?? "—"}</div>
                    {method.rejectionReason ? <div className="mt-2 text-xs text-danger">{method.rejectionReason}</div> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={method.status}>{pretty(method.status)}</StatusPill>
                    <button type="button" onClick={() => void setDefault(method.id)} disabled={busy !== null || method.isDefault} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">Set default</button>
                    <button type="button" onClick={() => void disable(method.id)} disabled={busy !== null} className="rounded-lg border border-danger/30 px-2 py-1.5 text-danger disabled:opacity-50" aria-label="Disable payout method">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Double-check payout details before saving. Incorrect bank details can delay manual transfers.
        </div>
      </div>
    </PortalShell>
  );
}

function Input(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-secondary">{props.label}</div>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary outline-none focus:border-brand" />
    </label>
  );
}

function Textarea(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block md:col-span-2">
      <div className="mb-1 text-xs font-semibold text-secondary">{props.label}</div>
      <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)} rows={3} className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-brand" />
    </label>
  );
}
