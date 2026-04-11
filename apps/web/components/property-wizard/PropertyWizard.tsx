"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import {
  createVendorPropertyDraft,
  getPropertyDocumentRequirements,
  updateVendorPropertyDraft,
  updateVendorPropertyLocation,
  updateVendorPropertyAmenities,
  type VendorPropertyDetail,
} from "@/lib/api/portal/vendor";

import { WizardStepper } from "./WizardStepper";
import { WIZARD_STEPS, type WizardState } from "./types";
import { StepBasicInfo } from "./steps/StepBasicInfo";
import { StepLocation } from "./steps/StepLocation";
import { StepDetails } from "./steps/StepDetails";
import { StepAmenities } from "./steps/StepAmenities";
import { StepPricing } from "./steps/StepPricing";
import { StepImages } from "./steps/StepImages";
import { StepDocuments } from "./steps/StepDocuments";
import { StepReview } from "./steps/StepReview";
import { normalizePropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types/property-type";

// -------------------------------------------------------------------
// Default state
// -------------------------------------------------------------------
const DEFAULT_STATE: WizardState = {
  propertyType: "APARTMENT",
  title: "", description: "", city: "Dubai", area: "", address: "",
  lat: null, lng: null, bedrooms: 1, bathrooms: 1, maxGuests: 2,
  selectedAmenityIds: [], basePrice: 25000, cleaningFee: 0,
  currency: "AED", minNights: 1, maxNights: null, isInstantBook: false,
};

function propertyToState(p: VendorPropertyDetail): WizardState {
  return {
    propertyType: normalizePropertyType(p.propertyType),
    title: p.title ?? "",
    description: p.description ?? "",
    city: p.city ?? "Dubai",
    area: p.area ?? "",
    address: p.address ?? "",
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    bedrooms: p.bedrooms ?? 1,
    bathrooms: p.bathrooms ?? 1,
    maxGuests: p.maxGuests ?? 2,
    selectedAmenityIds: (p.amenities ?? []).map((a) => a.amenity.id),
    basePrice: p.basePrice ?? 25000,
    cleaningFee: p.cleaningFee ?? 0,
    currency: (p.currency as WizardState["currency"]) ?? "AED",
    minNights: p.minNights ?? 1,
    maxNights: p.maxNights ?? null,
    isInstantBook: p.isInstantBook ?? false,
  };
}

// -------------------------------------------------------------------
// Slide variants
// -------------------------------------------------------------------
const SLIDE = {
  enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
};

// -------------------------------------------------------------------
// Props
// -------------------------------------------------------------------
type Props = {
  initialProperty?: VendorPropertyDetail;
  onCreated?: (property: VendorPropertyDetail) => void;
};

// -------------------------------------------------------------------
// Wizard
// -------------------------------------------------------------------
export function PropertyWizard({ initialProperty, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [property, setProperty] = useState<VendorPropertyDetail | undefined>(initialProperty);
  const [data, setData] = useState<WizardState>(() => initialProperty ? propertyToState(initialProperty) : DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef<string>(initialProperty ? JSON.stringify(propertyToState(initialProperty)) : "");

  const patch = useCallback((partial: Partial<WizardState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // -------------------------------------------------------------------
  // Persist per-step
  // -------------------------------------------------------------------
  async function validateRequiredDocumentsForStep(): Promise<string | null> {
    if (!property) {
      return "Save your property first before uploading documents.";
    }

    const requirements = await getPropertyDocumentRequirements();
    const uploadedTypes = new Set(
      (property.documents ?? []).map((doc) => String(doc.type).toUpperCase())
    );

    const missing = requirements.filter(
      (req) => req.required && !uploadedTypes.has(String(req.id).toUpperCase())
    );

    if (missing.length > 0) {
      const first = missing[0];
      return `${first.label} is required before moving to review.`;
    }

    return null;
  }

  async function persistStep(stepIndex: number): Promise<boolean> {
    setSaveError(null);
    setSaving(true);
    try {
      let updated: VendorPropertyDetail | undefined;
      const title = data.title.trim() || "Untitled Property";
      const city  = data.city.trim() || "Dubai";

      if (stepIndex === 0) {
        const input = { title, propertyType: data.propertyType, description: data.description.trim() || undefined, city, area: data.area.trim() || null, basePrice: data.basePrice, cleaningFee: data.cleaningFee, currency: data.currency };
        updated = property ? await updateVendorPropertyDraft(property.id, input) : await createVendorPropertyDraft({ ...input, lat: null, lng: null });
        if (!property) onCreated?.(updated);
      } else if (stepIndex === 1 && property) {
        if (data.lat !== null && data.lng !== null) {
          updated = await updateVendorPropertyLocation(property.id, { city, area: data.area.trim() || null, address: data.address.trim() || null, lat: data.lat, lng: data.lng });
        } else {
          updated = await updateVendorPropertyDraft(property.id, { title, city, basePrice: data.basePrice, area: data.area.trim() || null, address: data.address.trim() || null });
        }
      } else if (stepIndex === 2 && property) {
        updated = await updateVendorPropertyDraft(property.id, { title, city, basePrice: data.basePrice, bedrooms: data.bedrooms, bathrooms: data.bathrooms, maxGuests: data.maxGuests });
      } else if (stepIndex === 3 && property) {
        updated = await updateVendorPropertyAmenities(property.id, data.selectedAmenityIds);
      } else if (stepIndex === 4 && property) {
        updated = await updateVendorPropertyDraft(property.id, { title, city, basePrice: data.basePrice, cleaningFee: data.cleaningFee, currency: data.currency, minNights: data.minNights, maxNights: data.maxNights, isInstantBook: data.isInstantBook });
      } else if (stepIndex === 6) {
        const validationError = await validateRequiredDocumentsForStep();
        if (validationError) {
          setSaveError(validationError);
          return false;
        }
      }

      if (updated) {
        setProperty(updated);
        savedRef.current = JSON.stringify(propertyToState(updated));
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
  // Navigation
  // -------------------------------------------------------------------
  async function goNext() {
    if (step <= 6) {
      const ok = await persistStep(step);
      if (!ok) return;
    }
    setDir(1);
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
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
  // Step props
  // -------------------------------------------------------------------
  const stepProps = useMemo(() => ({
    data, patch,
    propertyId: property?.id,
    property,
    onPropertyUpdated: (p: VendorPropertyDetail) => {
      setProperty(p);
      setData(propertyToState(p));
    },
  }), [data, patch, property]);

  function renderStep(i: number) {
    switch (i) {
      case 0: return <StepBasicInfo {...stepProps} />;
      case 1: return <StepLocation {...stepProps} />;
      case 2: return <StepDetails {...stepProps} />;
      case 3: return <StepAmenities {...stepProps} />;
      case 4: return <StepPricing {...stepProps} />;
      case 5: return <StepImages {...stepProps} />;
      case 6: return <StepDocuments {...stepProps} />;
      case 7: return <StepReview {...stepProps} />;
      default: return null;
    }
  }

  const isLastStep  = step === WIZARD_STEPS.length - 1;
  const isFirstStep = step === 0;
  const currentStep = WIZARD_STEPS[step];

  // Tip copy per step
  const TIP_TEXT: Record<number, string> = {
    0: "A great title includes property type, a key feature, and location. Keep it under 80 chars.",
    1: "Pin as close to your property as possible. Guests see an approximate area until they book.",
    2: "Be accurate with your guest count — overbooking leads to bad reviews.",
    3: "All amenities are pre-selected. Just remove the ones you don't offer.",
    4: "Price in AED if your target market is UAE-based. You can update currency any time.",
    5: "Listings with 10+ photos get significantly more bookings. Upload your best shots first.",
    6: "Document requirements are loaded dynamically by backend policy. Upload all required files before review.",
    7: "Admin review is typically completed within 24-48 business hours.",
  };

  return (
    <PortalShell
      role="vendor"
      title={data.title.trim() || "New listing"}
      subtitle={`Step ${step + 1} of ${WIZARD_STEPS.length} — ${currentStep?.label}`}
    >
      {/* Stepper */}
      <WizardStepper steps={WIZARD_STEPS} current={step} onGoTo={goTo} />

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

          {/* Save error */}
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
                  : <>{step === 4 ? "Save & Continue" : "Continue"} <ChevronRight className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </div>

        {/* ── Right: info panel ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Listing preview card */}
            {property && (
              <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Your listing</div>
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
                <div className={["mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                  property.status === "PUBLISHED" ? "bg-success/15 text-success" :
                  property.status === "UNDER_REVIEW" ? "bg-warning/15 text-warning" :
                  "bg-warm-alt text-muted"].join(" ")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {property.status.replace(/_/g, " ")}
                </div>
              </div>
            )}

            {/* Progress steps */}
            <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Progress</div>
              <div className="space-y-2">
                {WIZARD_STEPS.map((s, i) => (
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

            {/* Tip */}
            <div className="rounded-3xl border border-brand/15 bg-[linear-gradient(135deg,rgba(248,242,232,0.8),rgba(240,232,219,0.6))] p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand/50 mb-2">Tip</div>
              <p className="text-xs text-secondary leading-relaxed">{TIP_TEXT[step]}</p>
            </div>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
