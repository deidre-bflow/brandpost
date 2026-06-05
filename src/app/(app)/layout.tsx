import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Palette, CalendarDays, Sparkles, Link2 } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { BrandflowIcon, BrandflowWordmark } from "@/components/BrandflowLogo";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/brands",      label: "Brands",      icon: Palette },
  { href: "/generate",    label: "Generate",    icon: Sparkles },
  { href: "/calendar",    label: "Calendar",    icon: CalendarDays },
  { href: "/connections", label: "Connections", icon: Link2 },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen" style={{ background: "#f0f2f7" }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0c1628 0%, #0f2044 60%, #111827 100%)" }}
      >
        {/* Subtle top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(139,92,246,0.25) 0%, transparent 70%)" }}
        />

        {/* ── Logo area ── */}
        <div className="relative px-5 pt-6 pb-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <BrandflowIcon size={36} />
            <div>
              <BrandflowWordmark className="text-xl" />
            </div>
          </div>
          {/* DRYVN badge */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">by</span>
            <div className="flex items-center gap-1">
              {/* Inline DRYVN mark for dark background */}
              <span className="font-black italic text-sm tracking-tight leading-none">
                <span className="text-white/90">DRYV</span>
                <span style={{ color: "#60a5fa" }}>N</span>
                <span style={{ color: "#93c5fd", fontSize: "0.65em" }}>↑</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 relative">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-white/50 hover:text-white transition-all duration-200 relative overflow-hidden"
              style={{}}
            >
              {/* Hover/active gradient pill */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.1) 100%)" }}
              />
              <Icon className="h-4 w-4 flex-shrink-0 relative z-10 group-hover:text-violet-300 transition-colors" />
              <span className="text-sm font-medium relative z-10">{label}</span>
            </Link>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="relative px-4 pb-5 pt-3 border-t border-white/[0.07]">
          <p className="text-[11px] text-white/25 px-1 mb-3 truncate">{user.email}</p>
          <SignOutButton />
          {/* Bottom brand credit */}
          <p className="mt-4 text-center text-[9px] text-white/20 tracking-widest uppercase">
            Designed &amp; Developed by DRYVN
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
