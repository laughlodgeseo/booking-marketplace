"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { addToWishlist, removeFromWishlist } from "@/lib/api/wishlist";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type WishlistHeartProps = {
  propertyId: string;
  initialInWishlist?: boolean;
  size?: number;
  className?: string;
};

export function WishlistHeart({
  propertyId,
  initialInWishlist = false,
  size = 20,
  className = "",
}: WishlistHeartProps) {
  const { status } = useAuth();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (status !== "authenticated") return;
      if (loading) return;

      setLoading(true);
      try {
        if (inWishlist) {
          const res = await removeFromWishlist(propertyId);
          if (res.ok) setInWishlist(false);
        } else {
          const res = await addToWishlist(propertyId);
          if (res.ok) setInWishlist(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [propertyId, inWishlist, loading, status],
  );

  if (status !== "authenticated") return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={`
        inline-flex items-center justify-center rounded-full
        p-1.5 transition-all duration-200
        hover:scale-110 active:scale-95
        ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"}
        ${className}
      `}
    >
      <Heart
        size={size}
        className={cn(
          "transition-all duration-300",
          inWishlist
            ? "fill-red-500 text-red-500 scale-110"
            : "fill-transparent text-white drop-shadow-md scale-100",
          loading && "animate-pulse",
        )}
        style={inWishlist ? { filter: "drop-shadow(0 0 6px rgba(239,68,68,0.4))" } : undefined}
      />
    </button>
  );
}
