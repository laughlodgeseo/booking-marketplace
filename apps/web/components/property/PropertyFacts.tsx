"use client";

import type { PropertyDetail } from "@/lib/types/property";
import {
  Bath,
  BedDouble,
  MapPin,
  Users,
  Clock,
  CalendarCheck2,
  ShieldCheck,
  LayoutGrid,
} from "lucide-react";
import { useLocale } from "next-intl";
import PropertySectionCard from "@/components/property/PropertySectionCard";
import { normalizeLocale } from "@/lib/i18n/config";

type Props = {
  property: PropertyDetail;
};

function StatCard(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.76)] p-3.5 shadow-[0_8px_18px_rgba(11,15,25,0.08)] ring-1 ring-white/72">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
          {props.icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-secondary">{props.label}</div>
          <div className="mt-0.5 text-sm font-semibold text-primary">{props.value}</div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyFacts({ property: p }: Props) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const guests = isAr ? `حتى ${p.maxGuests} ضيف` : `Up to ${p.maxGuests} guests`;
  const bedrooms = p.bedrooms !== null ? `${p.bedrooms}` : isAr ? "استوديو" : "Studio";
  const bathrooms = p.bathrooms !== null ? `${p.bathrooms}` : isAr ? "مشترك/خاص" : "Shared/Private";

  const locationLine = [p.area ?? null, p.city ?? null].filter(Boolean).join(", ") || (isAr ? "الإمارات" : "UAE");

  return (
    <PropertySectionCard>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
          <LayoutGrid className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-primary">
            {isAr ? "نظرة سريعة" : "At a glance"}
          </div>
          <p className="text-xs text-secondary">
            {isAr ? "تفاصيل الإقامة الأساسية في مكان واحد." : "Essential stay details in one view."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Users className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "الضيوف" : "Guests"}
          value={guests}
        />

        <StatCard
          icon={<BedDouble className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "غرف النوم" : "Bedrooms"}
          value={bedrooms}
        />

        <StatCard
          icon={<Bath className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "الحمّامات" : "Bathrooms"}
          value={bathrooms}
        />

        <StatCard
          icon={<MapPin className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "المنطقة" : "Area"}
          value={locationLine}
        />

        <StatCard
          icon={<CalendarCheck2 className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "تسجيل الوصول" : "Check-in"}
          value={isAr ? "بعد 3:00 مساءً" : "After 3:00 PM"}
        />

        <StatCard
          icon={<Clock className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "تسجيل المغادرة" : "Check-out"}
          value={isAr ? "قبل 11:00 صباحاً" : "Before 11:00 AM"}
        />

        <StatCard
          icon={<ShieldCheck className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />}
          label={isAr ? "الإلغاء" : "Cancellation"}
          value={isAr ? "تظهر السياسة قبل الدفع" : "Policy shown before checkout"}
        />
      </div>
    </PropertySectionCard>
  );
}
