"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBookingStatusDirect, type BookingListItem } from "@/lib/api/bookings";

type PollState =
  | { kind: "idle"; booking: BookingListItem | null; message?: never }
  | { kind: "polling"; booking: BookingListItem | null; message?: never }
  | { kind: "error"; booking: BookingListItem | null; message: string };

export function useBookingPoll(args: {
  bookingId: string;
  enabled: boolean;
  intervalMs?: number;
  maxMs?: number;
}) {
  const intervalMs = args.intervalMs ?? 5000;
  const maxMs = args.maxMs ?? 2 * 60 * 1000;

  const [state, setState] = useState<PollState>({ kind: "idle", booking: null });
  const [ticks, setTicks] = useState(0);
  const [nowMs, setNowMs] = useState(0);

  const startAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const remainingMs = useMemo(() => {
    const b = state.booking;
    if (!b?.expiresAt) return null;

    const t = new Date(b.expiresAt).getTime();
    if (Number.isNaN(t)) return null;

    const ms = t - nowMs;
    return Math.max(0, ms);
  }, [state.booking, nowMs]);

  useEffect(() => {
    // cleanup always
    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let deferredUpdateTimer: number | null = null;

    // stop polling
    if (!args.enabled) {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startAtRef.current = null;
      deferredUpdateTimer = window.setTimeout(() => {
        setNowMs(0);
        setState((prev) => ({ kind: "idle", booking: prev.booking ?? null }));
      }, 0);
      return () => {
        if (deferredUpdateTimer != null) {
          window.clearTimeout(deferredUpdateTimer);
        }
      };
    }

    // start polling
    startAtRef.current = Date.now();
    deferredUpdateTimer = window.setTimeout(() => {
      setNowMs(startAtRef.current ?? 0);
      setState((prev) => ({ kind: "polling", booking: prev.booking ?? null }));
      setTicks(0);
    }, 0);

    const tickOnce = async () => {
      try {
        const now = Date.now();
        const b = await getBookingStatusDirect({ bookingId: args.bookingId });
        setNowMs(now);
        setState({ kind: "polling", booking: b });
        setTicks((t) => t + 1);

        // stop if exceeded max
        const started = startAtRef.current ?? Date.now();
        if (Date.now() - started >= maxMs) {
          if (timerRef.current != null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setState((prev) => ({ kind: "idle", booking: prev.booking ?? null }));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Polling failed";
        setState((prev) => ({ kind: "error", booking: prev.booking ?? null, message: msg }));
      }
    };

    void tickOnce();

    timerRef.current = window.setInterval(() => {
      void tickOnce();
    }, intervalMs);

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (deferredUpdateTimer != null) {
        window.clearTimeout(deferredUpdateTimer);
      }
    };
  }, [args.bookingId, args.enabled, intervalMs, maxMs]);

  return { state, remainingMs, ticks };
}
