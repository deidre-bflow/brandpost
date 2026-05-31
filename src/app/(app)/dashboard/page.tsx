import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles, Palette, CalendarDays, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: brandCount },
    { count: postCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  const stats = [
    { label: "Brands",        value: brandCount ?? 0,   icon: Palette,     color: "from-violet-500 to-purple-600" },
    { label: "Total Posts",   value: postCount ?? 0,    icon: CalendarDays, color: "from-blue-500 to-cyan-600" },
    { label: "Awaiting Review", value: pendingCount ?? 0, icon: Sparkles,  color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your social content overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${color} items-center justify-center mb-3`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-black text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/brands/new" className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Palette className="h-5 w-5 text-violet-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="font-semibold text-slate-900">Add a Brand</p>
          <p className="text-sm text-slate-500 mt-1">Set up brand kit, tone, and content pillars</p>
        </Link>

        <Link href="/generate" className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-purple-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="font-semibold text-slate-900">Generate 30 Days</p>
          <p className="text-sm text-slate-500 mt-1">AI content calendar for any brand</p>
        </Link>
      </div>
    </div>
  );
}
