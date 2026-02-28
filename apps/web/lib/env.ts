export type PublicEnv = {
  googleMapsApiKey: string | null;
  googleMapsMapId: string | null;
};

function optionalNonEmpty(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

export const ENV: PublicEnv = {
  googleMapsApiKey: optionalNonEmpty(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  googleMapsMapId: optionalNonEmpty(process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID),
};
