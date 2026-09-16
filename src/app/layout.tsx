import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "CivicPulse | Risk Intelligence",
  description: "AI-Powered Urban Risk Intelligence & Response Simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased bg-stone-50 text-slate-900 overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
