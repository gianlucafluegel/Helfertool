import type { Metadata } from "next";
import { getBrand } from "@/lib/brand-server";
import { BRANDS } from "@/lib/brand";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { clubName, favicon } = BRANDS[await getBrand()];
  return {
    title: `Helfertool | ${clubName}`,
    description: `Helfereinsätze verwalten für den ${clubName}`,
    icons: { icon: favicon },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const brand = await getBrand();
  return (
    <html
      lang="de"
      data-brand={brand}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
