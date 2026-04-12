"use client";

import { useMemo, useState } from "react";
import type { VendorPropertyDetail, VendorPropertyDraftInput } from "@/lib/api/portal/vendor";
import {
  getVendorPropertyDraft,
  publishVendorProperty,
  requestVendorPropertyUnpublish,
  updateVendorPropertyDraft,
  updateVendorPropertyLocation,
} from "@/lib/api/portal/vendor";
import { ReviewChecklistCard, computeGates } from "@/components/portal/vendor/property/ReviewChecklistCard";
import { VendorPropertyTimeline } from "./VendorPropertyTimeline";
import { VendorPropertyMediaSection } from "./VendorPropertyMediaSection";
import { VendorPropertyDocsSection } from "./VendorPropertyDocsSection";
import { VendorPropertySubmitSection } from "./VendorPropertySubmitSection";
import { VendorPropertyAmenitiesSection } from "./VendorPropertyAmenitiesSection";

type Props = {
  initial: VendorPropertyDetail;
};

type TabKey = "REVIEW" | "BASICS" | "LOCATION" | "AMENITIES" | "PHOTOS" | "DOCUMENTS";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold",
        active ? "bg-brand text-accent-text" : "bg-surface text-primary ring-1 ring-line hover:bg-warm-alt",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm font-semibold text-primary">{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function looksUnauthorized(msg: string) {
  const s = msg.toLowerCase();
  return s.includes("unauthorized") || s.includes('"statuscode": 401') || s.includes("status\": 401") || s.includes("401");
}

export default function VendorPropertyEditForm({ initial }: Props) {
  const [tab, setTab] = useState<TabKey>("REVIEW");
  const [p, setP] = useState<VendorPropertyDetail>(initial);

  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const gates = useMemo(() => computeGates(p), [p]);
  const canSubmit = gates.gates.every((g) => g.ok);

  const [draft, setDraft] = useState<VendorPropertyDraftInput>(() => ({
    title: p.title,
    slug: p.slug,
    description: p.description ?? "",

    city: p.city,
    area: p.area ?? "",
    address: p.address ?? "",

    maxGuests: p.maxGuests,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,

    basePrice: p.basePrice,
    cleaningFee: p.cleaningFee,
    currency: p.currency,

    minNights: p.minNights,
    maxNights: p.maxNights,

    checkInFromMin: p.checkInFromMin,
    checkInToMax: p.checkInToMax,
    checkOutMin: p.checkOutMin,

    isInstantBook: p.isInstantBook,
  }));

  const [loc, setLoc] = useState(() => ({
    city: p.city ?? "",
    area: p.area ?? "",
    address: p.address ?? "",
    lat: p.lat ?? 25.2048,
    lng: p.lng ?? 55.2708,
  }));

  async function refresh(label = "Refreshing...") {
    setError(null);
    setOkMsg(null);
    setBusy(label);
    try {
      const next = await getVendorPropertyDraft(p.id);
      setP(next);
      setOkMsg("Updated ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    setError(null);
    setOkMsg(null);
    setBusy("Saving basics...");

    try {
      const updated = await updateVendorPropertyDraft(p.id, {
        ...draft,
        area: (draft.area ?? "").trim() || null,
        address: (draft.address ?? "").trim() || null,
        description: (draft.description ?? "").trim() || undefined,
        slug: (draft.slug ?? "").trim() || undefined,
        currency: (draft.currency ?? "").trim() || undefined,
      });
      setP(updated);
      setOkMsg("Saved ✅");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveLocation() {
    setError(null);
    setOkMsg(null);
    setBusy("Saving location...");

    try {
      const updated = await updateVendorPropertyLocation(p.id, {
        city: loc.city.trim(),
        area: loc.area.trim() || null,
        address: loc.address.trim() || null,
        lat: Number(loc.lat),
        lng: Number(loc.lng),
      });

      setP(updated);
      setOkMsg("Location saved ✅");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location save failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setError(null);
    setOkMsg(null);
    setBusy("Publishing...");

    try {
      const updated = await publishVendorProperty(p.id);
      setP(updated);
      setOkMsg("Published ✅");
      setTab("REVIEW");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function unpublish() {
    setError(null);
    setOkMsg(null);
    setBusy("Unpublishing...");

    try {
      await requestVendorPropertyUnpublish(p.id);
      const refreshed = await getVendorPropertyDraft(p.id);
      setP(refreshed);
      setOkMsg("Unpublish request submitted ✅");
      setTab("REVIEW");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unpublish request failed");
    } finally {
      setBusy(null);
    }
  }

  const unauthorized = error ? looksUnauthorized(error) : false;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-primary">{p.title}</h1>
            <p className="mt-1 text-sm text-secondary">
              Status: <span className="font-semibold text-primary">{p.status}</span> • City:{" "}
              <span className="font-semibold text-primary">{p.city}</span>
            </p>
            <p className="mt-2 text-xs text-muted">
              Production rule: meaningful changes to APPROVED/PUBLISHED reset listing to DRAFT (review safety).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === "REVIEW"} onClick={() => setTab("REVIEW")}>
              Review
            </TabButton>
            <TabButton active={tab === "BASICS"} onClick={() => setTab("BASICS")}>
              Basics
            </TabButton>
            <TabButton active={tab === "LOCATION"} onClick={() => setTab("LOCATION")}>
              Location
            </TabButton>
            <TabButton active={tab === "AMENITIES"} onClick={() => setTab("AMENITIES")}>
              Amenities
            </TabButton>
            <TabButton active={tab === "PHOTOS"} onClick={() => setTab("PHOTOS")}>
              Photos
            </TabButton>
            <TabButton active={tab === "DOCUMENTS"} onClick={() => setTab("DOCUMENTS")}>
              Documents
            </TabButton>
          </div>
        </div>

        {busy ? (
          <div className="mt-4 rounded-xl border border-line bg-warm-alt p-3 text-sm text-secondary">{busy}</div>
        ) : null}

        {okMsg ? (
          <div className="mt-4 rounded-xl border border-success/30 bg-success/12 p-3 text-sm text-success">{okMsg}</div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger whitespace-pre-wrap">
            {error}
            {unauthorized ? (
              <div className="mt-3 text-xs text-danger">
                Tip: your vendor token may be missing/expired. Go to <span className="font-semibold">/vendor/login</span>{" "}
                and sign in again.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void refresh()}
            className="rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-primary ring-1 ring-line hover:bg-warm-alt disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {tab === "REVIEW" ? (
        <div className="space-y-6">
          <VendorPropertyTimeline status={p.status} />

          <ReviewChecklistCard property={p} />

          <VendorPropertySubmitSection
            property={p}
            onSubmitted={() => {
              void refresh("Refreshing after submit...");
              setTab("REVIEW");
            }}
          />

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h3 className="text-base font-semibold text-primary">Publish controls</h3>
            <p className="mt-1 text-sm text-secondary">
              Publish is only available after admin approval. Search visibility depends on PUBLISHED.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={busy !== null || !canSubmit || p.status !== "DRAFT"}
                onClick={() => setTab("PHOTOS")}
                className="rounded-xl bg-surface px-5 py-2.5 text-sm font-semibold text-primary ring-1 ring-line hover:bg-warm-alt disabled:opacity-50"
              >
                Finish checklist
              </button>

              <button
                type="button"
                disabled={busy !== null || p.status !== "APPROVED"}
                onClick={() => void publish()}
                className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-inverted hover:bg-success disabled:opacity-50"
              >
                Publish (after APPROVED)
              </button>

              <button
                type="button"
                disabled={busy !== null || p.status !== "PUBLISHED"}
                onClick={() => void unpublish()}
                className="rounded-xl bg-surface px-5 py-2.5 text-sm font-semibold text-primary ring-1 ring-line hover:bg-warm-alt disabled:opacity-50"
              >
                Unpublish
              </button>
            </div>

            {!canSubmit ? (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 p-3 text-sm text-warning">
                Not ready. Complete missing items above (backend will enforce anyway).
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "BASICS" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Basics</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input
                value={draft.title}
                onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Slug" hint="optional (auto-generated otherwise)">
              <input
                value={draft.slug ?? ""}
                onChange={(e) => setDraft((s) => ({ ...s, slug: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="City">
              <input
                value={draft.city}
                onChange={(e) => setDraft((s) => ({ ...s, city: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Area">
              <input
                value={draft.area ?? ""}
                onChange={(e) => setDraft((s) => ({ ...s, area: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Address">
              <input
                value={draft.address ?? ""}
                onChange={(e) => setDraft((s) => ({ ...s, address: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Currency">
              <input
                value={draft.currency ?? ""}
                onChange={(e) => setDraft((s) => ({ ...s, currency: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Base price (nightly)">
              <input
                type="number"
                value={draft.basePrice}
                onChange={(e) => setDraft((s) => ({ ...s, basePrice: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Cleaning fee">
              <input
                type="number"
                value={draft.cleaningFee ?? 0}
                onChange={(e) => setDraft((s) => ({ ...s, cleaningFee: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Max guests">
              <input
                type="number"
                value={draft.maxGuests ?? 2}
                onChange={(e) => setDraft((s) => ({ ...s, maxGuests: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Bedrooms">
              <input
                type="number"
                value={draft.bedrooms ?? 1}
                onChange={(e) => setDraft((s) => ({ ...s, bedrooms: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Bathrooms">
              <input
                type="number"
                value={draft.bathrooms ?? 1}
                onChange={(e) => setDraft((s) => ({ ...s, bathrooms: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Min nights">
              <input
                type="number"
                value={draft.minNights ?? 1}
                onChange={(e) => setDraft((s) => ({ ...s, minNights: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
                className="min-h-[120px] w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary sm:col-span-2"
              />
            </Field>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={busy !== null}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
            >
              Save basics
            </button>
          </div>
        </section>
      ) : null}

      {tab === "LOCATION" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Location</h3>
          <p className="mt-1 text-sm text-secondary">Next step: map pin UX. For now this matches backend requirements exactly.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={loc.city}
                onChange={(e) => setLoc((s) => ({ ...s, city: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Area">
              <input
                value={loc.area}
                onChange={(e) => setLoc((s) => ({ ...s, area: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Address">
              <input
                value={loc.address}
                onChange={(e) => setLoc((s) => ({ ...s, address: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary sm:col-span-2"
              />
            </Field>

            <Field label="Latitude">
              <input
                type="number"
                value={loc.lat}
                onChange={(e) => setLoc((s) => ({ ...s, lat: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>

            <Field label="Longitude">
              <input
                type="number"
                value={loc.lng}
                onChange={(e) => setLoc((s) => ({ ...s, lng: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
              />
            </Field>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void saveLocation()}
              disabled={busy !== null}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
            >
              Save location
            </button>
          </div>
        </section>
      ) : null}

      {tab === "AMENITIES" ? (
        <VendorPropertyAmenitiesSection
          property={p}
          onChanged={(next) => {
            setP(next);
            setOkMsg(null);
            setError(null);
          }}
        />
      ) : null}

      {tab === "PHOTOS" ? (
        <VendorPropertyMediaSection
          propertyId={p.id}
          media={p.media}
          onChanged={() => {
            void refresh("Refreshing after media change...");
            setOkMsg(null);
            setError(null);
          }}
        />
      ) : null}

      {tab === "DOCUMENTS" ? (
        <VendorPropertyDocsSection
          propertyId={p.id}
          documents={p.documents}
          documentStatus={p.documentStatus}
          documentRejectionReason={p.documentRejectionReason}
          onChanged={() => {
            void refresh("Refreshing after document upload...");
            setOkMsg(null);
            setError(null);
          }}
        />
      ) : null}
    </div>
  );
}
