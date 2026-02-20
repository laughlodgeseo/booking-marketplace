import { PaymentResultCard } from "@/components/checkout/PaymentResultCard";

type PageProps = {
  searchParams: Promise<{ bookingId?: string }>;
};

export default async function PaymentCancelledPage(props: PageProps) {
  const sp = await props.searchParams;
  const bookingId = (sp.bookingId ?? "").trim();

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <PaymentResultCard tone="cancelled" bookingId={bookingId} />
      </div>
    </main>
  );
}
