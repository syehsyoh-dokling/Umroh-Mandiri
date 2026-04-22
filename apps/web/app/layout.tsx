import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MUWAHID | Asisten Umroh Digital",
  description:
    "Platform modern untuk menemani perjalanan umroh dari riset, persiapan, perbandingan paket, administrasi, hingga keberangkatan.",
  keywords: [
    "umroh",
    "paket umroh",
    "travel umroh resmi",
    "asisten umroh digital",
    "visa umroh",
    "kalkulator umroh",
    "promo umroh",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "MUWAHID | Asisten Umroh Digital",
    description:
      "Bandingkan paket, siapkan administrasi, dan rencanakan perjalanan umroh dengan pengalaman digital yang lebih modern.",
    type: "website",
    locale: "id_ID",
    siteName: "MUWAHID",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUWAHID | Asisten Umroh Digital",
    description:
      "Platform digital untuk membantu jamaah merencanakan umroh dengan lebih jelas, tenang, dan modern.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} font-[family-name:var(--font-sans)]`}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
