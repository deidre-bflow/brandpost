"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Palette, CalendarDays, Sparkles, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { href: "/brands",      label: "Brands",       icon: Palette },
  { href: "/generate",    label: "Generate",     icon: Sparkles },
  { href: "/calendar",    label: "Calendar",     icon: CalendarDays },
  { href: "/approved",    label: "Approved",     icon: CheckCircle2 },
  { href: "/declined",    label: "Needs Changes",icon: AlertCircle },
  { href: "/connections", label: "Connections",  icon: Link2 },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-5 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden",
              active
                ? "text-white"
                : "text-white/45 hover:text-white",
            )}
          >
            {/* Active / hover background */}
            <span
              className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              style={{
                background: active
                  ? "linear-gradient(90deg, rgba(139,92,246,0.35) 0%, rgba(59,130,246,0.2) 100%)"
                  : "linear-gradient(90deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.1) 100%)",
              }}
            />
            {/* Active left accent bar */}
            {active && (
              <span
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                style={{ background: "linear-gradient(180deg,#a855f7,#6366f1)" }}
              />
            )}
            <Icon
              className={cn(
                "h-4 w-4 flex-shrink-0 relative z-10 transition-colors",
                active ? "text-violet-300" : "group-hover:text-violet-300",
              )}
            />
            <span className="text-sm font-medium relative z-10">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
