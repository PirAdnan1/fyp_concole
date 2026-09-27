import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "FYP Management System",
  description: "Final Year Project coordination: students, groups, defence rooms and scheduling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
          <footer className="border-t border-line px-6 py-4 text-xs text-ink/50">
            FYP Management System — Coordinator Console
          </footer>
        </div>
      </body>
    </html>
  );
}
