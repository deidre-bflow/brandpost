import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Palette, CalendarDays, Sparkles, Link2, LogOut } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/brands",       label: "Brands",      icon: Palette },
  { href: "/generate",     label: "Generate",    icon: Sparkles },
  { href: "/calendar",     label: "Calendar",    icon: CalendarDays },
  { href: "/connections",  label: "Connections", icon: Link2 },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <span className="text-white font-black text-base">B</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">BrandFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] text-sm font-medium transition-colors"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User / Sign out */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-500 px-3 mb-2 truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
