export function humanizeEnum(value?: string | null): string {
  if (!value) return "Not available";

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatBookingStatusForCustomer(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "CONFIRMED":
      return "Confirmed";
    case "PENDING_PAYMENT":
      return "Payment pending";
    case "PENDING":
      return "Pending";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
    case "EXPIRED":
      return "Expired";
    default:
      return humanizeEnum(status);
  }
}

export function formatPaymentStatusForCustomer(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "CAPTURED":
    case "PAID":
    case "SUCCEEDED":
    case "SUCCESS":
      return "Payment received";
    case "AUTHORIZED":
    case "AUTHORIZE":
      return "Payment authorized";
    case "PENDING":
    case "PROCESSING":
    case "PENDING_PAYMENT":
      return "Payment processing";
    case "FAILED":
      return "Payment failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return status ? humanizeEnum(status) : "Not available";
  }
}

export function formatMinutesFromMidnight(
  minutes?: number | null,
  options?: { fallback?: string },
): string {
  if (typeof minutes !== "number" || Number.isNaN(minutes)) {
    return options?.fallback ?? "Not available";
  }

  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  const date = new Date();
  date.setHours(hours, mins, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatFriendlyBookingReference(id?: string | null): string {
  const compact = (id ?? "").replace(/[^a-zA-Z0-9]/g, "");
  if (!compact) return "Not available";
  return `LL-${compact.slice(-5).toUpperCase()}`;
}
