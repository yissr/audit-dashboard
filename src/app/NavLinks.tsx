"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/batches", label: "Batches" },
  { href: "/facilities", label: "Facilities" },
  { href: "/carriers", label: "Carriers" },
  { href: "/periods", label: "Periods" },
];

interface Props {
  simEnabled: boolean;
}

export default function NavLinks({ simEnabled }: Props) {
  const pathname = usePathname();

  const links = simEnabled
    ? [...navLinks, { href: "/sim-inbox", label: "⚡ Sim Inbox" }]
    : navLinks;

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              isActive
                ? "bg-white/20 text-white font-medium underline underline-offset-2"
                : "text-blue-100 hover:text-white hover:bg-white/10"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
