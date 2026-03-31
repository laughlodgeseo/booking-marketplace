import { apiFetch, type HttpResult } from "@/lib/http";

export type WishlistItem = {
  id: string;
  propertyId: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
    area: string | null;
    basePrice: number;
    currency: string;
    media: Array<{ url: string; alt: string | null }>;
  };
};

export function addToWishlist(propertyId: string): Promise<HttpResult<{ id: string; propertyId: string }>> {
  return apiFetch(`/wishlist/${propertyId}`, { method: "POST" });
}

export function removeFromWishlist(propertyId: string): Promise<HttpResult<{ removed: boolean }>> {
  return apiFetch(`/wishlist/${propertyId}`, { method: "DELETE" });
}

export function getWishlist(page = 1, pageSize = 20): Promise<HttpResult<{
  items: WishlistItem[];
  total: number;
  page: number;
  pageSize: number;
}>> {
  return apiFetch(`/wishlist?page=${page}&pageSize=${pageSize}`);
}

export function checkWishlist(propertyId: string): Promise<HttpResult<{ inWishlist: boolean }>> {
  return apiFetch(`/wishlist/check/${propertyId}`);
}
