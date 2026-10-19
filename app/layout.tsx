import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "flag-icons/css/flag-icons.min.css";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Statecraft's situation-room HUD only; not preloaded, so other pages never fetch it.
const hudMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "GeoPolitics",
  description: "The world, explained: wars, alliances, money and power on one living globe.",
};

export const viewport: Viewport = {
  themeColor: "#f3f1ec",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable} ${hudMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        {/* Vercel serves the analytics script; elsewhere it would only 404. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
