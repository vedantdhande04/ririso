import type { Metadata, Viewport } from "next";
import { Nunito, Quicksand } from "next/font/google";

import { AppNav } from "@/components/layout/AppNav";
import { PlanningGate } from "@/components/planning/PlanningGate";
import { SoftConfetti } from "@/components/ui/SoftConfetti";

import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RIRISO — Riya's MPSC Study Companion",
  description:
    "A cozy study companion for planning, committing, studying, and reflecting.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex flex-1 flex-col pb-20 md:pb-0 md:pl-56">
          {children}
        </div>
        <AppNav />
        <PlanningGate />
        <SoftConfetti />
      </body>
    </html>
  );
}
