import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Sage — Your personal financial advisor",
  description: "A private financial advisor that knows your whole picture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-900">
            <strong>Work in progress</strong> — Sage is an active personal project. This hosted
            preview uses fictional demo data, and the live AI advisor is disabled here (it runs
            against a real Claude API key when self-hosted).
          </div>
        )}
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
