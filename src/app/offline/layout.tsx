import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Check your connection.",
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
