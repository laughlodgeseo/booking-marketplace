import type { ComponentType } from "react";
import {
  Wifi,
  Car,
  Snowflake,
  Tv,
  Waves,
  Dumbbell,
  UtensilsCrossed,
  Microwave,
  Refrigerator,
  WashingMachine,
  Droplets,
  ShieldCheck,
  Lock,
  Briefcase,
  BedDouble,
  Bath,
  Wind,
  Coffee,
  Baby,
  Dog,
  CigaretteOff,
  Users,
  MapPin,
  Sparkles,
  Flame,
  PlugZap,
  KeyRound,
  Clock,
  Building2,
  TreePalm,
  Sun,
  LifeBuoy,
  Music,
  Camera,
  Sofa,
  LampDesk,
  ConciergeBell,
  CircleHelp,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

export type AmenityKey =
  | "WIFI"
  | "PARKING_FREE"
  | "PARKING_PAID"
  | "AIR_CONDITIONING"
  | "HEATING"
  | "TV"
  | "POOL"
  | "GYM"
  | "KITCHEN"
  | "MICROWAVE"
  | "OVEN"
  | "KETTLE"
  | "REFRIGERATOR"
  | "WASHER"
  | "DRYER"
  | "HOT_WATER"
  | "ELEVATOR"
  | "SECURITY"
  | "DOORMAN"
  | "LOCK"
  | "WORKSPACE"
  | "FAMILY_FRIENDLY"
  | "PET_FRIENDLY"
  | "NO_SMOKING"
  | "SLEEPS"
  | "BEDROOMS"
  | "BATHROOMS"
  | "LOCATION"
  | "HOUSEKEEPING"
  | "BALCONY"
  | "SEA_VIEW"
  | "CITY_VIEW"
  | "24H_CHECKIN"
  | "CHECKIN_TIME"
  | "CHECKOUT_TIME"
  | "FIRE_EXTINGUISHER"
  | "SMOKE_ALARM"
  | "CARBON_MONOXIDE_ALARM"
  | "FIRST_AID"
  | "WIFI_BACKUP"
  | "COFFEE"
  | "SOUND_SYSTEM"
  | "NETFLIX"
  | "CCTV"
  | "SOFA"
  | "DESK"
  | "CONCIERGE"
  | "OTHER";

export type AmenityMeta = {
  key: AmenityKey;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const OTHER: AmenityMeta = {
  key: "OTHER",
  label: "Amenity",
  Icon: CircleHelp,
};

const AMENITY_ALIASES: Record<string, AmenityKey> = {
  PARKING: "PARKING_FREE",
  FREE_PARKING: "PARKING_FREE",
  PARKING_ON_PREMISES: "PARKING_FREE",
  SMOKE_FREE: "NO_SMOKING",
  AIRCON: "AIR_CONDITIONING",
  AIRCONDITIONING: "AIR_CONDITIONING",
  AIR_CONDITIONER: "AIR_CONDITIONING",
  WIFI_24_7: "WIFI",
  WIRELESS_INTERNET: "WIFI",
  WI_FI: "WIFI",
  SWIMMING_POOL: "POOL",
  FITNESS_CENTER: "GYM",
  WASHING_MACHINE: "WASHER",
  ELECTRIC_KETTLE: "KETTLE",
  WATER_KETTLE: "KETTLE",
  KETTLE: "KETTLE",
  OVEN: "OVEN",
  BAKING_OVEN: "OVEN",
  BUILT_IN_OVEN: "OVEN",
  SMART_TV: "NETFLIX",
  STREAMING: "NETFLIX",
  STREAMING_SERVICE: "NETFLIX",
  STREAMING_SERVICES: "NETFLIX",
  NETFLIX: "NETFLIX",
  FIRE_SAFETY_KIT: "FIRE_EXTINGUISHER",
  SMOKE_DETECTOR: "SMOKE_ALARM",
  CARBON_MONOXIDE_DETECTOR: "CARBON_MONOXIDE_ALARM",
  CARBON_MONOXIDE_SENSOR: "CARBON_MONOXIDE_ALARM",
  FIRST_AID_KIT: "FIRST_AID",
  FIRST_AID_BOX: "FIRST_AID",
};

export const AMENITY_CATALOG: Record<AmenityKey, AmenityMeta> = {
  WIFI: { key: "WIFI", label: "Wi-Fi", Icon: Wifi },
  WIFI_BACKUP: { key: "WIFI_BACKUP", label: "Wi-Fi backup", Icon: PlugZap },

  PARKING_FREE: { key: "PARKING_FREE", label: "Free parking", Icon: Car },
  PARKING_PAID: { key: "PARKING_PAID", label: "Paid parking", Icon: Car },

  AIR_CONDITIONING: { key: "AIR_CONDITIONING", label: "Air conditioning", Icon: Snowflake },
  HEATING: { key: "HEATING", label: "Heating", Icon: Flame },

  TV: { key: "TV", label: "TV", Icon: Tv },

  POOL: { key: "POOL", label: "Pool", Icon: Waves },
  GYM: { key: "GYM", label: "Gym", Icon: Dumbbell },

  KITCHEN: { key: "KITCHEN", label: "Kitchen", Icon: UtensilsCrossed },
  MICROWAVE: { key: "MICROWAVE", label: "Microwave", Icon: Microwave },
  OVEN: { key: "OVEN", label: "Oven", Icon: Flame },
  KETTLE: { key: "KETTLE", label: "Kettle", Icon: Coffee },
  REFRIGERATOR: { key: "REFRIGERATOR", label: "Refrigerator", Icon: Refrigerator },

  WASHER: { key: "WASHER", label: "Washer", Icon: WashingMachine },
  DRYER: { key: "DRYER", label: "Dryer", Icon: Wind },
  HOT_WATER: { key: "HOT_WATER", label: "Hot water", Icon: Droplets },

  ELEVATOR: { key: "ELEVATOR", label: "Elevator", Icon: Building2 },

  SECURITY: { key: "SECURITY", label: "Building security", Icon: ShieldCheck },
  DOORMAN: { key: "DOORMAN", label: "Doorman", Icon: KeyRound },
  CCTV: { key: "CCTV", label: "CCTV", Icon: Camera },
  SMOKE_ALARM: { key: "SMOKE_ALARM", label: "Smoke alarm", Icon: ShieldAlert },
  CARBON_MONOXIDE_ALARM: {
    key: "CARBON_MONOXIDE_ALARM",
    label: "Carbon monoxide alarm",
    Icon: AlertTriangle,
  },
  FIRE_EXTINGUISHER: { key: "FIRE_EXTINGUISHER", label: "Fire extinguisher", Icon: LifeBuoy },
  FIRST_AID: { key: "FIRST_AID", label: "First aid kit", Icon: ShieldCheck },

  LOCK: { key: "LOCK", label: "Smart lock", Icon: Lock },

  WORKSPACE: { key: "WORKSPACE", label: "Dedicated workspace", Icon: Briefcase },
  DESK: { key: "DESK", label: "Desk", Icon: LampDesk },

  FAMILY_FRIENDLY: { key: "FAMILY_FRIENDLY", label: "Family friendly", Icon: Baby },
  PET_FRIENDLY: { key: "PET_FRIENDLY", label: "Pet friendly", Icon: Dog },
  NO_SMOKING: { key: "NO_SMOKING", label: "No smoking", Icon: CigaretteOff },

  SLEEPS: { key: "SLEEPS", label: "Guests", Icon: Users },
  BEDROOMS: { key: "BEDROOMS", label: "Bedrooms", Icon: BedDouble },
  BATHROOMS: { key: "BATHROOMS", label: "Bathrooms", Icon: Bath },

  LOCATION: { key: "LOCATION", label: "Location", Icon: MapPin },
  HOUSEKEEPING: { key: "HOUSEKEEPING", label: "Housekeeping", Icon: Sparkles },
  BALCONY: { key: "BALCONY", label: "Balcony", Icon: TreePalm },
  SEA_VIEW: { key: "SEA_VIEW", label: "Sea view", Icon: Sun },
  CITY_VIEW: { key: "CITY_VIEW", label: "City view", Icon: Building2 },

  COFFEE: { key: "COFFEE", label: "Coffee", Icon: Coffee },
  NETFLIX: { key: "NETFLIX", label: "Netflix", Icon: Tv },
  SOUND_SYSTEM: { key: "SOUND_SYSTEM", label: "Sound system", Icon: Music },
  SOFA: { key: "SOFA", label: "Sofa", Icon: Sofa },

  CONCIERGE: { key: "CONCIERGE", label: "Concierge", Icon: ConciergeBell },

  "24H_CHECKIN": { key: "24H_CHECKIN", label: "24-hour check-in", Icon: Clock },
  CHECKIN_TIME: { key: "CHECKIN_TIME", label: "Check-in time", Icon: Clock },
  CHECKOUT_TIME: { key: "CHECKOUT_TIME", label: "Check-out time", Icon: Clock },

  OTHER,
};

export function normalizeAmenityKey(input: string): AmenityKey {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const alias = AMENITY_ALIASES[cleaned];
  if (alias) return alias;

  return (Object.prototype.hasOwnProperty.call(AMENITY_CATALOG, cleaned)
    ? (cleaned as AmenityKey)
    : "OTHER");
}

export function getAmenityMeta(input: string): AmenityMeta {
  const key = normalizeAmenityKey(input);
  if (key === "OTHER") return { ...OTHER, label: input.trim() || OTHER.label };
  return AMENITY_CATALOG[key];
}
