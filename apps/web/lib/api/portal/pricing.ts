import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export type PricingRuleType = "SEASONAL" | "WEEKEND" | "WEEKDAY" | "HOLIDAY" | "CUSTOM";

export type PricingRule = {
  id: string;
  propertyId: string;
  type: PricingRuleType;
  name: string | null;
  startDate: string;
  endDate: string;
  priceMultiplier: number | null;
  fixedPrice: number | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

export async function listPricingRules(propertyId: string): Promise<PricingRule[]> {
  const res = await apiFetch<PricingRule[]>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/pricing-rules`,
    { method: "GET", credentials: "include", cache: "no-store" }
  );
  return unwrap(res);
}

export async function createPricingRule(
  propertyId: string,
  input: {
    type: PricingRuleType;
    name?: string;
    startDate: string;
    endDate: string;
    priceMultiplier?: number;
    fixedPrice?: number;
    priority?: number;
  }
): Promise<PricingRule> {
  const res = await apiFetch<PricingRule>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/pricing-rules`,
    { method: "POST", credentials: "include", cache: "no-store", body: input }
  );
  return unwrap(res);
}

export async function updatePricingRule(
  propertyId: string,
  ruleId: string,
  input: Partial<{
    name: string;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
    fixedPrice: number | null;
    priority: number;
    isActive: boolean;
  }>
): Promise<PricingRule> {
  const res = await apiFetch<PricingRule>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/pricing-rules/${encodeURIComponent(ruleId)}`,
    { method: "PATCH", credentials: "include", cache: "no-store", body: input }
  );
  return unwrap(res);
}

export async function deletePricingRule(
  propertyId: string,
  ruleId: string
): Promise<void> {
  const res = await apiFetch<void>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/pricing-rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE", credentials: "include", cache: "no-store" }
  );
  unwrap(res);
}
