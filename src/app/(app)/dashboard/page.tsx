import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Sparkles, Palette, CalendarDays, ArrowRight,
  CheckCircle2, MessageSquare, Clock, TrendingUp,
  AlertCircle,
} from "lucide-react";

const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  facebook:  { label: "Facebook",  cls: "bg-blue-100 text-blue-700" },
  instagram: { label: "Instagram", cls: "bg-pink-100 text-pink-700" },
  linkedin:  { label: "LinkedIn",  cls: "bg-sky-100 text-sky-700" },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // ── Fetch all counts in parallel ─────────────────────────────────────────
  const [
    { count: brandCount },
    { count: postCount },
    { count: draftCount },
    { count: approvedCount },
    { count: commentCount },
    { count: postedCount },
    { data: feedbackPosts },
  ] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("client_approved", true),
    supabase.from("posts").select("*", { count: "exact", head: true }).not("client_comment", "is", null),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "posted"),

    // Feedback feed — posts with client interaction, newest first
    supabase
      .from("posts")
      .select("id, platform, content, client_comment, client_approved, client_approved_at, scheduled_for, updated_at, brand:brands(name, primary_color, logo_url)")
      .or("client_approved.eq.true,client_comment.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(15),
  ]);

  const stats = [
    { label: "Brands",       value: brandCount   ?? 0, gradient: "from-violet-500 to-purple-600",  icon: Palette,       href: "/brands" },
    { label: "Total Posts",  value: postCount    ?? 0, gradient: "from-blue-500 to-cyan-500",      icon: CalendarDays,  href: "/calendar" },
    { label: "Drafts",       value: draftCount   ?? 0, gradient: "from-amber-400 to-orange-500",   icon: Clock,         href: "/calendar" },
    { label: "Published",    value: postedCount  ?? 0, gradient: "from-emerald-400 to-teal-500",   icon: TrendingUp,    href: "/calendar" },
    { label: "Approved",     value: approvedCount ?? 0, gradient: "from-green-400 to-emerald-600", icon: CheckCircle2,  href: "/calendar" },
    { label: "Commented",    value: commentCount  ?? 0, gradient: "from-pink-400 to-rose-500",     icon: MessageSquare, href: "/calendar" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Your social content overview at a glance</p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-7">
        {stats.map(({ label, value, gradient, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className={`inline-flex w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} items-center justify-center mb-2.5`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Client Feedback Feed (2/3 width) ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900">Client Feedback</h2>
                <p className="text-xs text-slate-400 mt-0.5">Comments and approvals from your clients</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3" /> {approvedCount} approved
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                  <MessageSquare className="h-3 w-3" /> {commentCount} comments
                </span>
              </div>
            </div>

            {/* Feed */}
            {!feedbackPosts || feedbackPosts.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No client feedback yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Share a review link from the Calendar to get started
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {feedbackPosts.map((post: any) => {
                  const brand = post.brand as any;
                  const badge = PLATFORM_BADGE[post.platform] ?? { label: post.platform, cls: "bg-slate-100 text-slate-600" };
                  const isApproved = post.client_approved;
                  const hasComment = !!post.client_comment;
                  const timeAgo = post.updated_at
                    ? formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })
                    : "";

                  return (
                    <div key={post.id} className="flex gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      {/* Brand colour dot */}
                      <div className="flex-shrink-0 pt-0.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs"
                          style={{ background: brand?.primary_color ?? "#8b5cf6" }}
                        >
                          {brand?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-slate-800">{brand?.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {post.scheduled_for && (
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(post.scheduled_for), "d MMM")}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-300 ml-auto">{timeAgo}</span>
                        </div>

                        {/* Post preview */}
                        <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">
                          {post.content}
                        </p>

                        {/* Comment */}
                        {hasComment && (
                          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700 italic leading-relaxed">
                              "{post.client_comment}"
                            </p>
                          </div>
                        )}

                        {/* Status pill */}
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : hasComment ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Needs changes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                          {isApproved && post.client_approved_at && (
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(post.client_approved_at), "d MMM 'at' HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/calendar"
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                View all posts in Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link href="/brands/new"
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50 hover:border-violet-200 border border-transparent transition-all">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Palette className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Add a Brand</p>
                  <p className="text-xs text-slate-400">Brand kit, tone & pillars</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </Link>

              <Link href="/generate"
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 hover:border-purple-200 border border-transparent transition-all">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Generate Content</p>
                  <p className="text-xs text-slate-400">AI posts for any brand</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-500 transition-colors" />
              </Link>

              <Link href="/calendar"
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Open Calendar</p>
                  <p className="text-xs text-slate-400">Review & approve posts</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Feedback summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Feedback Summary</h2>
            <div className="space-y-3">
              {/* Approved */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-600">Approved</span>
                    <span className="text-xs font-black text-emerald-600">{approvedCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                      style={{ width: postCount ? `${((approvedCount ?? 0) / postCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Commented */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-600">With comments</span>
                    <span className="text-xs font-black text-amber-600">{commentCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                      style={{ width: postCount ? `${((commentCount ?? 0) / postCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Published */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-600">Published</span>
                    <span className="text-xs font-black text-blue-600">{postedCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all"
                      style={{ width: postCount ? `${((postedCount ?? 0) / postCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-600">Drafts pending</span>
                    <span className="text-xs font-black text-slate-600">{draftCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-300 to-slate-400 transition-all"
                      style={{ width: postCount ? `${((draftCount ?? 0) / postCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
