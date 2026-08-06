import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบจัดการหอพัก",
  description: "ระบบจัดการหอพักและห้องเช่าอัจฉริยะ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
