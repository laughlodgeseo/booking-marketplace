import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import Providers from "./providers";
import { AuthProvider } from "@/lib/auth/auth-context";
import { directionForLocale } from "@/lib/i18n/config";
import { getLocaleMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";
import RouteScrollReset from "@/components/site/RouteScrollReset";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rentpropertyuae.com"),
  title: {
    default: "Laugh & Lodge",
    template: "%s • Laugh & Lodge",
  },
  description:
    "Luxury short-term rental management in Dubai — professionally operated homes for owners and premium stays for guests.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Laugh & Lodge",
    title: "Laugh & Lodge",
    description:
      "Luxury short-term rental management in Dubai — professionally operated homes for owners and premium stays for guests.",
    url: "/",
    images: [{ url: "/brand/logo.svg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Laugh & Lodge",
    description:
      "Luxury short-term rental management in Dubai — professionally operated homes for owners and premium stays for guests.",
    images: ["/brand/logo.svg"],
  },
  icons: {
    icon: "/brand/logo.svg",
    shortcut: "/brand/logo.svg",
    apple: "/brand/logo.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  const messages = getLocaleMessages(locale);
  const dir = directionForLocale(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        {/* Fetch typefaces at runtime so CI and hosting builds don't depend on Google's font CSS response format. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@500;600;700&family=Tajawal:wght@400;500;700&display=swap"
        />
      </head>
      <body
        suppressHydrationWarning
        className={[
          "font-site min-h-screen bg-(--site-bg)",
          locale === "ar" ? "font-arabic-locale" : "",
        ].join(" ")}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <AuthProvider>
              <RouteScrollReset />
              {children}
            </AuthProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
