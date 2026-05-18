import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { SessionHandler } from "@/components/session-handler";
import { NavigationProgress } from "@/components/navigation-progress";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const gotham = localFont({
  src: [
    { path: "./fonts/GothamLight.otf", weight: "300", style: "normal" },
    { path: "./fonts/GothamBold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-gotham",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DECA Engage",
    template: "%s | DECA Engage",
  },
  description: "Supercharge your DECA chapter's engagement with AI-powered tools for events, attendance, and member management.",
  keywords: ["DECA", "engagement", "chapter", "events", "attendance", "leaderboard"],
  authors: [{ name: "DECA Engage" }],
  openGraph: {
    title: "DECA Engage",
    description: "Supercharge your DECA chapter's engagement with AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DECA Engage",
    description: "Supercharge your DECA chapter's engagement with AI",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#00539B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", gotham.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body
        className={`${gotham.variable} font-gotham flex min-h-screen flex-col bg-[var(--gray-50)] text-[var(--gray-700)] font-normal`}
      >
        <DisclaimerBanner />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ErrorBoundary>
            <NavigationProgress />
            <SessionHandler />
            {children}
            <Toaster position="top-center" duration={4000} toastOptions={{ style: { borderRadius: "0.5rem", fontSize: "0.875rem" } }} />
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
