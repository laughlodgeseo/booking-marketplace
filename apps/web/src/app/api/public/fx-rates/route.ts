import { NextResponse } from "next/server";
import { fallbackFxRates } from "@/lib/currency/currency";
import { apiUrl } from "@/lib/api/base";

const CACHE_CONTROL = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";

function fallbackResponse() {
  return NextResponse.json(
    {
      baseCurrency: "AED",
      asOfDate: null,
      rates: fallbackFxRates(),
      fallback: true,
    },
    {
      status: 200,
      headers: { "cache-control": CACHE_CONTROL },
    }
  );
}

export const revalidate = 60;

export async function GET() {
  const upstream = apiUrl("/public/fx-rates");

  try {
    const res = await fetch(upstream, {
      method: "GET",
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return fallbackResponse();
    }

    const contentType = res.headers.get("content-type") ?? "application/json; charset=utf-8";
    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch {
    // Keep UI usable when API is offline in local development.
    return fallbackResponse();
  }
}
