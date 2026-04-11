"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

import { PortalShell } from "@/components/portal/PortalShell";
import {
  createAdminProperty,
  updateAdminProperty,
  updateAdminPropertyAmenities,
  getAdminAmenitiesCatalog,
  getAdminVendors,
  type AdminPropertyDetail,
  type AdminMediaItem,
} from "@/lib/api/portal/admin";
import type { AmenitiesCatalogResponse } from "@/lib/api/portal/vendor";

import { WizardStepper } from "./WizardStepper";
import { type WizardState } from "./types";
import { StepBasicInfo } from "./steps/StepBasicInfo";
import { StepLocation } from "./steps/StepLocation";
import { StepDetails } from "./steps/StepDetails";
import { StepAmenities } from "./steps/StepAmenities";
import { StepPricing } from "./steps/StepPricing";
import { AdminStepImages } from "./steps/admin/AdminStepImages";
import { AdminStepPublish } from "./steps/admin/AdminStepPublish";
import { PROPERTY_TYPE_LABELS } from "@/lib/types/property-type";

// -------------------------------------------------------------------
// Admin wizard steps (6 steps — no separate review, admin publishes direct)
// -------------------------------------------------------------------
const ADMIN_STEPS = [
  { id: "basics",    label: "Basics",    emoji: "🏠" },
  { id: "location",  label: "Location",  emoji: "📍" },
  { id: "details",   label: "Details",   emoji: "🛏" },
  { id: "amenities", label: "Amenities", emoji: "✨" },
  { id: "pricing",   label: "Pricing",   emoji: "💰" },
  { id: "photos",    label: "Photos",    emoji: "📸" },
  { id: "publish",   label: "Publish",   emoji: "🌐" },
] as const;

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildSlug(title: string): string {
  const s = slugify(title);
  return s || `admin-property-${Date.now()}`;
}

const DEFAULT_STATE: WizardState = {
  propertyType: "APARTMENT",
  title: "", description: "", city: "Dubai", area: "", address: "",
  lat: null, lng: null, bedrooms: 1, bathrooms: 1, maxGuests: 2,
  selectedAmenityIds: [], basePrice: 25000, cleaningFee: 0,
  currency: "AED", minNights: 1, maxNights: null, isInstantBook: false,
};

// Adapt admin catalog to vendor format (structurally identical)
async function fetchAdminCatalog(): Promise<AmenitiesCatalogResponse> {
  const res = await getAdminAmenitiesCatalog();
  return res as unknown as AmenitiesCatalogResponse;
}

// -------------------------------------------------------------------
// Slide variants
// -------------------------------------------------------------------
const SLIDE = {
  enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
};

type SubmitState = { kind: "idle" } | { kind: "busy" } | { kind: "success"; message: string } | { kind: "error"; message: string };

// -------------------------------------------------------------------
// AdminPropertyWizard
// -------------------------------------------------------------------
export function AdminPropertyWizard() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [property, setProperty] = useState<AdminPropertyDetail | null>(null);
  const [data, setData] = useState<WizardState>(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Admin-specific state
  const [vendorId, setVendorId] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const savedRef = useRef<string>("");

  const patch = useCallback((partial: Partial<WizardState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Load vendors
  useEffect(() => {
    let alive = true;
    async function load() {
      setVendorsLoading(true);
      try {
        const res = await getAdminVendors({ page: 1, pageSize: 200 });
        if (!alive) return;
        const items = Array.isArray(res.items) ? res.items : [];
        const options = (items as Record<string, unknown>[])
          .map((row) => {
            const id = typeof row.id === "string" ? row.id : "";
            if (!id) return null;
            const fullName = typeof row.fullName === "string" ? row.fullName : "";
            const email = typeof row.email === "string" ? row.email : "";
            const display = fullName || email || id;
            return { id, label: email ? `${display} (${email})` : display };
          })
          .filter((o): o is { id: string; label: string } => o !== null)
          .sort((a, b) => a.label.localeCompare(b.label));
        setVendorOptions(options);
      } catch {
        // vendor list is optional
      } finally {
        if (alive) setVendorsLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  // -------------------------------------------------------------------
  // Persist per-step
  // -------------------------------------------------------------------
  async function persistStep(stepIndex: number): Promise<boolean> {
    setSaveError(null);
    setSaving(true);
    try {
      const title = data.title.trim() || "Untitled Property";
      const city  = data.city.trim() || "Dubai";
      let updated: AdminPropertyDetail | undefined;

      if (stepIndex === 0) {
        const input = {
          title, slug: buildSlug(data.title), city, propertyType: data.propertyType,
          description: data.description.trim() || null,
          area: data.area.trim() || null,
          basePrice: data.basePrice, currency: data.currency,
          maxGuests: data.maxGuests, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
        };
        updated = property
          ? await updateAdminProperty(property.id, input)
          : await createAdminProperty({ ...input, vendorId: vendorId || null, publishNow: false });
      } else if (stepIndex === 1 && property) {
        updated = await updateAdminProperty(property.id, {
          city, area: data.area.trim() || null, address: data.address.trim() || null,
          lat: data.lat ?? undefined, lng: data.lng ?? undefined,
        });
      } else if (stepIndex === 2 && property) {
        updated = await updateAdminProperty(property.id, { bedrooms: data.bedrooms, bathrooms: data.bathrooms, maxGuests: data.maxGuests });
      } else if (stepIndex === 3 && property) {
        updated = await updateAdminPropertyAmenities(property.id, data.selectedAmenityIds);
      } else if (stepIndex === 4 && property) {
        updated = await updateAdminProperty(property.id, {
          basePrice: data.basePrice, cleaningFee: data.cleaningFee,
          currency: data.currency, minNights: data.minNights, maxNights: data.maxNights,
        });
      }

      if (updated) {
        setProperty(updated);
        savedRef.current = JSON.stringify(updated);
      }
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed — please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------
  // Final submit (step 6: create-if-needed + set vendor + publish)
  // -------------------------------------------------------------------
  async function handleFinalSubmit() {
    setSubmitState({ kind: "busy" });
    try {
      let target = property;

      if (!target) {
        const title = data.title.trim() || "Untitled Property";
        const city  = data.city.trim() || "Dubai";
        target = await createAdminProperty({
          title, slug: buildSlug(data.title), city, propertyType: data.propertyType,
          description: data.description.trim() || null,
          area: data.area.trim() || null,
          address: data.address.trim() || null,
          lat: data.lat ?? null, lng: data.lng ?? null,
          maxGuests: data.maxGuests, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
          basePrice: data.basePrice, cleaningFee: data.cleaningFee,
          currency: data.currency, minNights: data.minNights, maxNights: data.maxNights,
          vendorId: vendorId || null, publishNow,
        });
      } else {
        target = await updateAdminProperty(target.id, {
          vendorId: vendorId || null,
          publishNow,
        });
      }

      if (data.selectedAmenityIds.length > 0) {
        target = await updateAdminPropertyAmenities(target.id, data.selectedAmenityIds);
      }

      setProperty(target);
      setSubmitState({
        kind: "success",
        message: publishNow
          ? `Property created and published! Listing is now live.`
          : `Property created and saved as APPROVED. You can publish it from the editor.`,
      });
    } catch (e) {
      setSubmitState({ kind: "error", message: e instanceof Error ? e.message : "Create failed" });
    }
  }

  // -------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------
  async function goNext() {
    if (step <= 4) {
      const ok = await persistStep(step);
      if (!ok) return;
    }
    setDir(1);
    setStep((s) => Math.min(s + 1, ADMIN_STEPS.length - 1));
  }

  function goBack() {
    setSaveError(null);
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function goTo(index: number) {
    setSaveError(null);
    setDir(index > step ? 1 : -1);
    setStep(index);
  }

  // -------------------------------------------------------------------
  // Step props (shared vendor steps)
  // -------------------------------------------------------------------
  const vendorStepProps = useMemo(() => ({
    data, patch,
    propertyId: property?.id,
    property: undefined as never,
    onPropertyUpdated: () => {},
  }), [data, patch, property?.id]);

  function renderStep(i: number) {
    switch (i) {
      case 0: return <StepBasicInfo {...vendorStepProps} />;
      case 1: return <StepLocation {...vendorStepProps} />;
      case 2: return <StepDetails {...vendorStepProps} />;
      case 3: return <StepAmenities {...vendorStepProps} fetchCatalog={fetchAdminCatalog} />;
      case 4: return <StepPricing {...vendorStepProps} />;
      case 5: return (
        <AdminStepImages
          property={property}
          onMediaChanged={(media: AdminMediaItem[]) => {
            if (property) setProperty({ ...property, media } as AdminPropertyDetail);
          }}
        />
      );
      case 6: return (
        <AdminStepPublish
          property={property}
          vendorOptions={vendorOptions}
          vendorsLoading={vendorsLoading}
          vendorId={vendorId}
          publishNow={publishNow}
          onVendorChange={setVendorId}
          onPublishNowChange={setPublishNow}
          submitState={submitState}
          onSubmit={() => void handleFinalSubmit()}
          amenityCount={data.selectedAmenityIds.length}
        />
      );
      default: return null;
    }
  }

  const isLastStep  = step === ADMIN_STEPS.length - 1;
  const isFirstStep = step === 0;
  const currentStep = ADMIN_STEPS[step];

  const TIP_TEXT: Record<number, string> = {
    0: "Admin listings bypass the review process — they are created as APPROVED immediately.",
    1: "Drop a precise map pin. Guests see an approximate area until booking is confirmed.",
    2: "Accurate capacity prevents disputes with guests. Double-check before saving.",
    3: "Pre-select all amenities then remove what doesn't apply — faster than selecting individually.",
    4: "Set a competitive price for the area. You can update it anytime from the property editor.",
    5: "Upload at least a Cover photo plus the 4 required room categories before publishing.",
    6: "You can publish now or save as APPROVED and publish later from the properties list.",
  };

  return (
    <PortalShell
      role="admin"
      title={data.title.trim() || "New property"}
      subtitle={`Step ${step + 1} of ${ADMIN_STEPS.length} — ${currentStep?.label}`}
      right={
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-2 rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-secondary shadow-sm hover:bg-warm-alt transition"
        >
          ← Back to properties
        </Link>
      }
    >
      {/* Stepper */}
      <WizardStepper steps={ADMIN_STEPS} current={step} onGoTo={goTo} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* ── Left: step form ── */}
        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderStep(step)}
            </motion.div>
          </AnimatePresence>

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {saveError}
            </motion.div>
          )}

          {/* Navigation */}
          {!(isLastStep && submitState.kind === "success") && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={goBack}
                disabled={isFirstStep || saving}
                className="inline-flex items-center gap-2 rounded-2xl border border-line/80 bg-surface px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm hover:bg-warm-alt disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {!isLastStep && (
                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-2.5 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover disabled:opacity-50 transition"
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : <>Continue <ChevronRight className="h-4 w-4" /></>}
                </button>
              )}
            </div>
          )}

          {/* Post-success link */}
          {submitState.kind === "success" && property && (
            <div className="mt-6 flex gap-3">
              <Link
                href={`/admin/properties/${encodeURIComponent(property.id)}/edit`}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover transition"
              >
                Open editor
              </Link>
              <Link
                href="/admin/properties"
                className="inline-flex items-center gap-2 rounded-2xl border border-line/80 bg-surface px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm hover:bg-warm-alt transition"
              >
                Back to properties
              </Link>
            </div>
          )}
        </div>

        {/* ── Right: info panel ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {property && (
              <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Created listing</div>
                <div className="text-sm font-semibold text-primary truncate">{data.title || "Untitled"}</div>
                <div className="mt-1 inline-flex items-center rounded-full bg-accent-soft/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  {PROPERTY_TYPE_LABELS[data.propertyType]}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                  <span>🛏 {data.bedrooms}</span>
                  <span>🚿 {data.bathrooms}</span>
                  <span>👥 {data.maxGuests}</span>
                </div>
                <div className="mt-1 text-xs text-muted truncate">
                  {data.city}{data.area ? `, ${data.area}` : ""}
                </div>
                <div className="mt-2 text-xs font-semibold text-brand">
                  {data.currency} {data.basePrice.toLocaleString()} / night
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Progress</div>
              <div className="space-y-2">
                {ADMIN_STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className={["h-1.5 w-1.5 rounded-full transition-all",
                      i < step ? "bg-success" : i === step ? "bg-brand scale-125" : "bg-line/60"].join(" ")} />
                    <span className={["text-xs transition-colors",
                      i === step ? "text-primary font-semibold" : i < step ? "text-success" : "text-muted"].join(" ")}>
                      {s.emoji} {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-brand/15 bg-[linear-gradient(135deg,rgba(248,242,232,0.8),rgba(240,232,219,0.6))] p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand/50 mb-2">Admin tip</div>
              <p className="text-xs text-secondary leading-relaxed">{TIP_TEXT[step]}</p>
            </div>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
