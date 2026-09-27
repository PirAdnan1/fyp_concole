"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/import", label: "Student Import" },
  { href: "/rooms", label: "Defence Rooms" },
  { href: "/defence", label: "Defence Scheduling" },
  { href: "/dashboard", label: "Room Dashboard" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        <span className="font-semibold text-sm tracking-tight">FYP Coordinator Console</span>
        <nav className="flex gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md transition ${
                  active ? "bg-accentSoft text-accent font-medium" : "text-ink/70 hover:bg-paper"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
