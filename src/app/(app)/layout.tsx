import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { BrandflowIcon } from "@/components/BrandflowLogo";
import { SidebarNav } from "@/components/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen" style={{ background: "#f0f2f7" }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0c1628 0%,#0f2044 60%,#111827 100%)" }}
      >
        {/* Top radial glow */}
        <div
          className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -10%,rgba(139,92,246,0.22) 0%,transparent 70%)" }}
        />

        {/* ── Logo ── */}
        <Link href="/dashboard" className="relative block px-5 pt-6 pb-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <BrandflowIcon size={36} />
            <div>
              <div className="font-black text-xl tracking-tight leading-none">
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg,#a5b4fc,#818cf8)" }}>Brand</span>
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg,#f9a8d4,#fb923c)" }}>flow</span>
              </div>
              {/* DRYVN credit */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] text-white/30 font-medium tracking-widest uppercase">by</span>
                <span className="font-black italic text-[11px] tracking-tight leading-none ml-0.5">
                  <span className="text-white/75">DRYV</span>
                  <span style={{ color: "#60a5fa" }}>N</span>
                  <span style={{ color: "#93c5fd", fontSize: "0.65em" }}>↑</span>
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Nav (client component for active states) ── */}
        <SidebarNav />

        {/* ── Footer ── */}
        <div className="relative px-4 pb-5 pt-3 border-t border-white/[0.07]">
          <p className="text-[11px] text-white/25 px-1 mb-3 truncate">{user.email}</p>
          <SignOutButton />
          <p className="mt-4 text-center text-[9px] text-white/15 tracking-widest uppercase">
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
