"use client";

import { useMemo, useState } from "react";
import type { CreateBookingResponse } from "@/lib/types/property";
import { apiFetch } from "@/lib/http";
import { formatBookingStatusForCustomer, formatFriendlyBookingReference } from "@/lib/customerDisplay";

type CreateUi =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "created"; bookingId: string; status: string; totalAmount: number; currency: string; expiresAt: string }
  | { kind: "error"; message: string };

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const m = (payload as { message?: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join(", ");
    if (typeof m === "string") return m;
  }
  return fallback;
}

function isCreateBookingResponse(payload: unknown): payload is CreateBookingResponse {
  if (typeof payload !== "object" || payload === null) return false;
  if (!("ok" in payload) || (payload as { ok?: unknown }).ok !== true) return false;
  if (!("booking" in payload)) return false;
  const b = (payload as { booking?: unknown }).booking;
  if (typeof b !== "object" || b === null) return false;
  return "id" in b && "status" in b && "totalAmount" in b && "currency" in b && "expiresAt" in b;
}

function formatIsoShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

function formatMoney(currency: string, value: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export default function CreateBookingCard(props: { holdId: string }) {
  const [ui, setUi] = useState<CreateUi>({ kind: "idle" });

  const holdId = props.holdId.trim();
  const canCreate = useMemo(() => holdId.length > 0, [holdId]);

  async function onCreate() {
    if (!canCreate) return;

    setUi({ kind: "creating" });

    try {
      const res = await apiFetch<unknown>("/bookings", {
        method: "POST",
        credentials: "include",
        body: { holdId },
        auth: "auto",
      });

      if (!res.ok) {
        setUi({
          kind: "error",
          message: extractErrorMessage(res.details, res.message),
        });
        return;
      }

      const data: unknown = res.data;
      if (!isCreateBookingResponse(data)) {
        setUi({ kind: "error", message: "Booking created but response format was unexpected." });
        return;
      }

      setUi({
        kind: "created",
        bookingId: data.booking.id,
        status: data.booking.status,
        totalAmount: data.booking.totalAmount,
        currency: data.booking.currency,
        expiresAt: data.booking.expiresAt,
      });
    } catch {
      setUi({ kind: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div>
        <div className="text-sm font-semibold text-primary">Create booking</div>
        <p className="mt-1 text-xs text-secondary">
          Confirm your reserved dates and continue to secure payment.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-warm-alt px-4 py-3 text-xs text-secondary">
        Your selected dates are temporarily reserved.
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate || ui.kind === "creating" || ui.kind === "created"}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-accent-text transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ui.kind === "creating"
            ? "Creating booking…"
            : ui.kind === "created"
              ? "Booking created"
              : "Create booking"}
        </button>

        {ui.kind === "created" ? (
          <div className="rounded-2xl border border-success/30 bg-success/12 p-4 text-sm text-success">
            <div className="font-semibold">Booking created</div>
            <div className="mt-2 text-xs text-success/80">
              Booking reference: <span className="font-semibold">{formatFriendlyBookingReference(ui.bookingId)}</span>
            </div>
            <div className="mt-1 text-xs text-success/80">
              Status: <span className="font-semibold">{formatBookingStatusForCustomer(ui.status)}</span>
            </div>
            <div className="mt-1 text-xs text-success/80">
              Total: <span className="font-semibold">{formatMoney(ui.currency, ui.totalAmount)}</span>
            </div>
            <div className="mt-1 text-xs text-success/80">
              Payment window expires: <span className="font-semibold">{formatIsoShort(ui.expiresAt)}</span>
            </div>

            <div className="mt-4 rounded-xl border border-success/30 bg-surface px-4 py-3 text-xs text-success/80">
              Next step: complete your secure payment.
            </div>
          </div>
        ) : null}

        {ui.kind === "error" ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 text-sm text-danger">
            {ui.message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
