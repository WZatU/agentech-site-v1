import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Oxanium, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site-config";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display"
});

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-brand"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Agentech",
    template: "%s | Agentech"
  },
  description: "Agentech is an AI-native robotics and intelligent systems company.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Agentech",
    description: "Agentech is an AI-native robotics and intelligent systems company.",
    url: siteUrl,
    siteName: "Agentech",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentech",
    description: "Agentech is an AI-native robotics and intelligent systems company."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plexMono.variable} ${plusJakartaSans.variable} ${oxanium.variable}`}
    >
      <body className="font-[var(--font-sans)] text-mist antialiased">
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
