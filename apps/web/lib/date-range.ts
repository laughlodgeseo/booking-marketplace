const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value?: string | null): value is string {
  return typeof value === "string" && ISO_DAY.test(value);
}

export function isValidIsoRange(checkIn?: string | null, checkOut?: string | null): boolean {
  if (!isIsoDay(checkIn) || !isIsoDay(checkOut)) return false;
  return checkOut > checkIn;
}
