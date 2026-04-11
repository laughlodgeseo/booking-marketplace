export const PROPERTY_TYPE_VALUES = [
  "APARTMENT",
  "VILLA",
  "STUDIO",
  "TOWNHOUSE",
  "PENTHOUSE",
  "CHALET",
] as const;

export type PropertyType = (typeof PROPERTY_TYPE_VALUES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  STUDIO: "Studio",
  TOWNHOUSE: "Townhouse",
  PENTHOUSE: "Penthouse",
  CHALET: "Chalet",
};

export function isPropertyType(value: unknown): value is PropertyType {
  return (
    typeof value === "string" &&
    (PROPERTY_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function normalizePropertyType(
  value: unknown,
  fallback: PropertyType = "APARTMENT",
): PropertyType {
  return isPropertyType(value) ? value : fallback;
}

export function propertyTypeLabel(value: unknown): string {
  return PROPERTY_TYPE_LABELS[normalizePropertyType(value)];
}
