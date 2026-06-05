import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CheckCircle2, User, Briefcase, CalendarDays, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  facebook:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "Facebook"  },
  instagram: { bg: "bg-pink-100",  text: "text-pink-700",  label: "Instagram" },
  linkedin:  { bg: "bg-sky-100",   text: "text-sky-700",   label: "LinkedIn"  },
};

export default async function ApprovedPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, platform, content, image_url, video_url, scheduled_for, client_comment, client_approved_at, client_name, client_position, brand:brands(name, primary_color, logo_url)")
    .eq("client_approved", true)
    .order("client_approved_at", { ascending: false });

  const total = posts?.length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Approved Posts</h1>
          </div>
          <p className="text-sm text-slate-500">
            {total} post{total !== 1 ? "s" : ""} approved by your clients
          </p>
        </div>
      </div>

      {/* Grid */}
      {!posts?.length ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No approved posts yet</p>
          <p className="text-sm text-slate-300 mt-1">Share a review link from the Calendar to get client approvals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {posts.map((post: any) => {
            const brand  = post.brand as any;
            const pStyle = PLATFORM_STYLES[post.platform] ?? { bg: "bg-slate-100", text: "text-slate-600", label: post.platform };

            return (
              <div key={post.id} className="flex flex-col bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                {/* Approved bar */}
                <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

                {/* Platform + brand */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                    {pStyle.label}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white font-black text-[9px]"
                      style={{ background: brand?.primary_color ?? "#8b5cf6" }}
                    >
                      {brand?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[80px]">{brand?.name}</span>
                  </div>
                </div>

                {/* Media */}
                {post.video_url ? (
                  <video src={post.video_url} controls className="w-full aspect-video object-cover bg-black" />
                ) : post.image_url ? (
                  <img src={post.image_url} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-slate-50 flex items-center justify-center text-slate-300 text-xs">No image</div>
                )}

                {/* Content */}
                <div className="px-4 pt-3 pb-2 flex-1">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{post.content}</p>
                </div>

                {/* Client comment */}
                {post.client_comment && (
                  <div className="mx-4 mb-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 italic leading-relaxed">"{post.client_comment}"</p>
                  </div>
                )}

                {/* Audit trail */}
                <div className="px-4 pb-4 border-t border-emerald-100 pt-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-700">Approved</span>
                    {post.client_approved_at && (
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {format(new Date(post.client_approved_at), "d MMM yyyy · HH:mm")}
                      </span>
                    )}
                  </div>
                  {post.client_name && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="font-semibold">{post.client_name}</span>
                      {post.client_position && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{post.client_position}</span>
                        </>
                      )}
                    </div>
                  )}
                  {post.scheduled_for && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <CalendarDays className="h-3 w-3 flex-shrink-0" />
                      Scheduled {format(new Date(post.scheduled_for), "d MMM yyyy")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
