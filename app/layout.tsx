import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Photos Retrieval Discovery Engine",
  description:
    "AI-powered research dashboard analyzing user retrieval behaviors, failure modes, and product opportunities for vaguely remembered photos and visual items.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
