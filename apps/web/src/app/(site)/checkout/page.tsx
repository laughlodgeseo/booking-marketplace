import type { Metadata } from "next";
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your booking",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return (
    <CheckoutPageClient
      propertyId={first(sp.propertyId)}
      holdId={first(sp.holdId)}
      checkIn={first(sp.checkIn)}
      checkOut={first(sp.checkOut)}
      guests={first(sp.guests)}
      slug={first(sp.slug)}
    />
  );
}
