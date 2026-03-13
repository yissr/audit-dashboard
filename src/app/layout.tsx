import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Empire Benefit Solutions — Audit Dashboard",
  description: "Workers' Compensation Audit Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b bg-[#1B2A4A] text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.jpg" alt="Empire Benefit Solutions" width={36} height={36} className="rounded-full" />
              <span className="font-bold text-lg leading-tight">Empire Benefit Solutions</span>
            </Link>
            <Link href="/" className="text-sm hover:text-blue-200">Dashboard</Link>
            <Link href="/batches" className="text-sm hover:text-blue-200">Batches</Link>
            <Link href="/facilities" className="text-sm hover:text-blue-200">Facilities</Link>
            <Link href="/carriers" className="text-sm hover:text-blue-200">Carriers</Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
