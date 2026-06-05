"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Check, MessageSquare, Loader2, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "facebook" | "instagram" | "linkedin";

interface ReviewPost {
  id: string;
  platform: Platform;
  content: string;
  image_url: string | null;
  video_url: string | null;
  scheduled_for: string | null;
  status: string;
  client_comment: string | null;
  client_approved: boolean;
}

interface ReviewBrand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

const PLATFORM_STYLES: Record<Platform, { gradient: string; text: string; dot: string; label: string }> = {
  facebook:  { gradient: "from-blue-50 to-blue-100/60",   text: "text-blue-700",  dot: "bg-blue-500",  label: "Facebook"  },
  instagram: { gradient: "from-pink-50 to-purple-50",     text: "text-pink-700",  dot: "bg-gradient-to-br from-pink-500 to-purple-600",  label: "Instagram" },
  linkedin:  { gradient: "from-sky-50 to-sky-100/60",     text: "text-sky-700",   dot: "bg-sky-600",   label: "LinkedIn"  },
};

// ── BrandFlow icon (inline SVG) ───────────────────────────────────────────────
function BrandflowMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="rs1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        <linearGradient id="rs2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
        <linearGradient id="rs3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#eab308"/><stop offset="100%" stopColor="#f97316"/>
        </linearGradient>
      </defs>
      <path d="M32 6 C50 6 58 18 58 32 C58 46 50 58 32 58" stroke="url(#rs1)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M32 58 C14 58 6 46 6 32 C6 18 14 6 32 6" stroke="url(#rs2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M32 14 C44 14 50 22 50 32 C50 42 44 50 32 50 C20 50 14 42 14 32" stroke="url(#rs3)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M20 50 L14 60 L28 54" stroke="url(#rs2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M32 20 L33.8 26.2 L40.2 26.2 L35.2 30.1 L37 36.3 L32 32.4 L27 36.3 L28.8 30.1 L23.8 26.2 L30.2 26.2 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
    </svg>
  );
}

// ── Post tile ─────────────────────────────────────────────────────────────────
function PostTile({ post, token, onUpdate }: {
  post: ReviewPost;
  token: string;
  onUpdate: (id: string, patch: Partial<ReviewPost>) => void;
}) {
  const [comment, setComment]   = useState(post.client_comment ?? "");
  const [approved, setApproved] = useState(post.client_approved);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const style = PLATFORM_STYLES[post.platform] ?? PLATFORM_STYLES.facebook;

  const save = useCallback(async (patch: { comment?: string; approved?: boolean }) => {
    setSaving(true);
    try {
      await fetch(`/api/review/${token}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      onUpdate(post.id, {
        ...(patch.comment  !== undefined ? { client_comment: patch.comment || null } : {}),
        ...(patch.approved !== undefined ? { client_approved: patch.approved }       : {}),
      });
    } finally {
      setSaving(false);
    }
  }, [token, post.id, onUpdate]);

  const handleApprove      = () => { const n = !approved; setApproved(n); void save({ approved: n }); };
  const handleCommentBlur  = () => { if (comment !== (post.client_comment ?? "")) void save({ comment }); };

  const LIMIT = 200;
  const isLong = post.content.length > LIMIT;
  const displayContent = isLong && !expanded ? post.content.slice(0, LIMIT) + "…" : post.content;

  return (
    <div className={cn(
      "flex flex-col rounded-2xl overflow-hidden transition-all duration-300",
      "bg-white border shadow-sm",
      approved
        ? "border-emerald-300 shadow-emerald-100 shadow-md"
        : "border-slate-200 hover:shadow-md hover:border-slate-300",
    )}>
      {/* Approved top glow bar */}
      {approved && (
        <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
      )}

      {/* Platform header */}
      <div className={cn("flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r", style.gradient)}>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />
        <span className={cn("text-xs font-bold tracking-wide uppercase", style.text)}>{style.label}</span>
        {post.scheduled_for && (
          <>
            <span className={cn("text-xs opacity-40", style.text)}>·</span>
            <span className={cn("text-xs font-medium opacity-60", style.text)}>
              {format(new Date(post.scheduled_for), "d MMM yyyy")}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          {approved && !saving && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </div>
      </div>

      {/* Media */}
      {post.video_url ? (
        <video src={post.video_url} controls className="w-full aspect-video object-cover bg-black" />
      ) : post.image_url ? (
        <img src={post.image_url} alt="post visual" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <span className="text-slate-300 text-sm font-medium">No image yet</span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{displayContent}</p>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)} className="text-xs font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Comment */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="font-semibold">Your comment</span>
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={handleCommentBlur}
          placeholder="Leave feedback or notes…"
          rows={3}
          className="w-full text-sm text-slate-700 placeholder:text-slate-300 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all bg-slate-50/50"
        />
      </div>

      {/* Approve button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleApprove}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-200 select-none",
            approved
              ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-sm"
              : "border-slate-200 bg-white text-slate-500 hover:border-violet-400 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 hover:text-violet-700",
          )}
        >
          <span className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-all",
            approved ? "bg-emerald-500 border-emerald-500" : "border-slate-300",
          )}>
            {approved && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
          {approved ? "Approved ✓" : "Approve this post"}
        </button>
      </div>
    </div>
  );
}

// ── Review page ───────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [brand, setBrand]       = useState<ReviewBrand | null>(null);
  const [posts, setPosts]       = useState<ReviewPost[]>([]);
  const [label, setLabel]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setBrand(d.brand); setPosts(d.posts); setLabel(d.label ?? null);
      })
      .catch(() => setError("Could not load review page."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpdate = useCallback((id: string, patch: Partial<ReviewPost>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const approvedCount = posts.filter(p => p.client_approved).length;
  const total         = posts.length;
  const allApproved   = total > 0 && approvedCount === total;
  const progress      = total ? (approvedCount / total) * 100 : 0;

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0c1628 0%,#0f2044 100%)" }}>
      <div className="flex flex-col items-center gap-4">
        <BrandflowMark size={48} />
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f8f9fc" }}>
      <div className="max-w-sm text-center">
        <BrandflowMark size={48} />
        <h2 className="text-lg font-bold text-slate-800 mt-4 mb-2">Link unavailable</h2>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f7" }}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 border-b border-white/10"
        style={{ background: "linear-gradient(135deg,#0c1628 0%,#0f2044 50%,#111827 100%)" }}
      >
        {/* Rainbow accent line */}
        <div className="h-0.5 bg-gradient-to-r from-orange-400 via-violet-500 via-cyan-400 to-emerald-400" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Left — dual brand */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <BrandflowMark size={32} />
              <div>
                <div className="flex items-baseline gap-1.5 leading-none">
                  <span className="font-black text-base tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">Brand</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-orange-300">flow</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-white/30 tracking-widest uppercase font-medium">by</span>
                  <span className="font-black italic text-[11px] tracking-tight leading-none">
                    <span className="text-white/80">DRYV</span>
                    <span style={{ color: "#60a5fa" }}>N</span>
                    <span style={{ color: "#93c5fd", fontSize: "0.7em" }}>↑</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 hidden sm:block" />

            {/* Client brand */}
            <div className="flex items-center gap-2.5 min-w-0 hidden sm:flex">
              {brand?.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5" />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: brand?.primary_color ?? "#6366f1" }}
                >
                  {brand?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-white truncate text-sm">{brand?.name}</p>
                {label && <p className="text-xs text-white/40">{label}</p>}
              </div>
            </div>
          </div>

          {/* Right — progress */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {allApproved ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5" /> All approved!
              </span>
            ) : (
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-xs font-semibold text-white/70">
                  {approvedCount} / {total} approved
                </span>
                <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg,#6366f1,#a855f7,#06b6d4)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Review your upcoming posts
          </h1>
          <p className="text-sm text-slate-500">
            Leave a comment and tick <strong>Approve</strong> on each post. Everything saves automatically.
          </p>
        </div>

        {/* Post grid */}
        {posts.length === 0 ? (
          <div className="text-center py-24">
            <BrandflowMark size={48} />
            <p className="text-slate-500 font-semibold mt-4">No posts to review yet</p>
            <p className="text-slate-400 text-sm mt-1">Check back once content has been scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <PostTile key={post.id} post={post} token={token} onUpdate={handleUpdate} />
            ))}
          </div>
        )}

        {/* Submit CTA */}
        {total > 0 && (
          <div className="mt-12 flex flex-col items-center gap-3">
            {submitted ? (
              <div className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-emerald-700 font-bold text-sm bg-emerald-50 border border-emerald-200 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
                Thank you! Your feedback has been received.
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSubmitted(true)}
                  className="group relative px-10 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)" }}
                >
                  <span className="relative z-10">
                    {allApproved ? "✓ Submit — all posts approved" : `Submit feedback · ${approvedCount}/${total} approved`}
                  </span>
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                </button>
                <p className="text-xs text-slate-400">Comments and approvals are saved automatically as you go.</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="mt-16 py-8 border-t border-white/10"
        style={{ background: "linear-gradient(135deg,#0c1628 0%,#0f2044 100%)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <BrandflowMark size={24} />
            <span className="font-black text-sm tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-pink-300">Brand</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-orange-300">flow</span>
            </span>
          </div>
          <p className="text-[11px] text-white/30 tracking-widest uppercase font-medium">
            Designed &amp; Developed by{" "}
            <span className="font-black italic">
              <span className="text-white/50">DRYV</span>
              <span style={{ color: "#60a5fa" }}>N</span>
              <span style={{ color: "#93c5fd" }}>↑</span>
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
