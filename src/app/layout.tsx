import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getSafeHttpOrigin, getPublicAppOrigin } from "@/lib/job-share";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? getPublicAppOrigin(env.appUrl)
      : getSafeHttpOrigin(env.appUrl),
  ),
  title: "CPGIS Jobs Portal",
  description:
    "A non-ArcGIS jobs portal with public sharing, address search, map-linked filtering, and member/admin workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
