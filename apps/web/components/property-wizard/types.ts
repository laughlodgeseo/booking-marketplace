import type { VendorPropertyDetail } from "@/lib/api/portal/vendor";
import type { PropertyType } from "@/lib/types/property-type";

export type WizardState = {
  propertyType: PropertyType;
  title: string;
  description: string;
  city: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  selectedAmenityIds: string[];
  basePrice: number;
  cleaningFee: number;
  currency: "AED" | "USD" | "EUR" | "GBP";
  minNights: number;
  maxNights: number | null;
  isInstantBook: boolean;
};

export type StepProps = {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  propertyId: string | undefined;
  property: VendorPropertyDetail | undefined;
  onPropertyUpdated: (p: VendorPropertyDetail) => void;
};

export const WIZARD_STEPS = [
  { id: "basics",    label: "Basics",    emoji: "🏠" },
  { id: "location",  label: "Location",  emoji: "📍" },
  { id: "details",   label: "Details",   emoji: "🛏" },
  { id: "amenities", label: "Amenities", emoji: "✨" },
  { id: "pricing",   label: "Pricing",   emoji: "💰" },
  { id: "photos",    label: "Photos",    emoji: "📸" },
  { id: "documents", label: "Documents", emoji: "📄" },
  { id: "review",    label: "Review",    emoji: "🚀" },
] as const;
