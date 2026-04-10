import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Manrope,
  Noto_Naskh_Arabic,
  Tajawal,
} from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import Providers from "./providers";
import { AuthProvider } from "@/lib/auth/auth-context";
import { directionForLocale } from "@/lib/i18n/config";
import { getLocaleMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";
import RouteScrollReset from "@/components/site/RouteScrollReset";

const arabicFont = Tajawal({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["400", "500", "700"],
});

const arabicDisplayFont = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const latinFont = Manrope({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

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
      <body
        suppressHydrationWarning
        className={[
          "font-site min-h-screen bg-[var(--site-bg)]",
          arabicFont.variable,
          arabicDisplayFont.variable,
          latinFont.variable,
          displayFont.variable,
          locale === "ar" ? "font-arabic-locale" : "",
        ].join(" ")}
      >
        {/* Google Identity Services — loaded lazily so it never blocks page render */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
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
