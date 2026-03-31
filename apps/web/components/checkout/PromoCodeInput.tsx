"use client";

import { useState, useCallback } from "react";
import { Tag, X, Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/http";

type PromoCodeInputProps = {
  bookingAmount: number;
  propertyId?: string;
  onApplied: (discount: { amount: number; promoCodeId: string }) => void;
  onRemoved: () => void;
};

export function PromoCodeInput({
  bookingAmount,
  propertyId,
  onApplied,
  onRemoved,
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{
    code: string;
    discountAmount: number;
    promoCodeId: string;
  } | null>(null);

  const handleApply = useCallback(async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);

    const res = await apiFetch<{
      valid: boolean;
      discountAmount: number;
      promoCodeId: string;
    }>("/bookings/promo/validate", {
      method: "POST",
      body: { code: code.trim(), bookingAmount, propertyId },
    });

    setLoading(false);

    if (res.ok) {
      setApplied({
        code: code.trim().toUpperCase(),
        discountAmount: res.data.discountAmount,
        promoCodeId: res.data.promoCodeId,
      });
      onApplied({
        amount: res.data.discountAmount,
        promoCodeId: res.data.promoCodeId,
      });
    } else {
      setError(res.message || "Invalid promo code");
    }
  }, [code, loading, bookingAmount, propertyId, onApplied]);

  const handleRemove = useCallback(() => {
    setApplied(null);
    setCode("");
    setError(null);
    onRemoved();
  }, [onRemoved]);

  if (applied) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Check size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {applied.code}
          </span>
          <span className="text-sm text-green-600">
            -AED {(applied.discountAmount / 100).toFixed(2)}
          </span>
        </div>
        <button
          onClick={handleRemove}
          className="p-1 text-green-600 hover:text-green-800 transition-colors"
          aria-label="Remove promo code"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Promo code"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 pl-1">{error}</p>
      )}
    </div>
  );
}
