import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export type VendorReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  hostResponseText: string | null;
  hostResponseAt: string | null;
  property: { id: string; title: string; slug: string };
  customer: { fullName: string | null };
};

export type VendorReviewsResponse = {
  items: VendorReviewItem[];
  page: number;
  pageSize: number;
  total: number;
};

export async function getVendorReviews(params?: {
  page?: number;
  pageSize?: number;
}): Promise<VendorReviewsResponse> {
  const res = await apiFetch<VendorReviewsResponse>("/portal/vendor/reviews", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 },
  });
  return unwrap(res);
}

export async function submitHostResponse(
  reviewId: string,
  responseText: string
): Promise<{ id: string; hostResponseText: string; hostResponseAt: string }> {
  const res = await apiFetch<{ id: string; hostResponseText: string; hostResponseAt: string }>(
    `/reviews/${encodeURIComponent(reviewId)}/response`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { responseText: responseText.trim() },
    }
  );
  return unwrap(res);
}
