import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/AuthProvider";
import { I18nProvider } from "@/components/I18nProvider";
import SiteHeader from "@/components/SiteHeader";
import { CountryProvider } from "@/lib/country";
import { Toaster } from "@/components/ui/sonner";
import { getServerLocale } from "@/lib/i18n/getLocale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WatchWeek",
  description: "Streaming TV Calendar",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="" />
        <link
          rel="preconnect"
          href="https://ojyoekltynijpqvkejpb.supabase.co"
          crossOrigin=""
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider locale={locale}>
          <AuthProvider>
            <CountryProvider>
              <SiteHeader />
              {children}
              <Toaster position="top-right" richColors closeButton />
            </CountryProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}