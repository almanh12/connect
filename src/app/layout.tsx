import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { NavigationProgress } from "@/components/navigation-progress";
import { Providers } from "@/components/providers";
import { SessionHandler } from "@/components/session-handler";
import { Toaster } from "@/components/ui/sonner";
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
    default: "WBC Connect",
    template: "%s | WBC Connect",
  },
  description:
    "Williams Business Council Connect — your chapter hub for events, attendance, practice, and member engagement.",
  keywords: ["DECA", "Williams Business Council", "WBC", "chapter", "events", "attendance"],
  authors: [{ name: "WBC Connect" }],
  openGraph: {
    title: "WBC Connect",
    description: "Williams Business Council chapter platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WBC Connect",
    description: "Williams Business Council chapter platform",
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
        <Providers>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ErrorBoundary>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <SessionHandler />
              {children}
              <Toaster position="top-center" duration={4000} />
            </ErrorBoundary>
          </div>
        </Providers>
      </body>
    </html>
  );
}
