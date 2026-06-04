"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Check, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
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

const PLATFORM_STYLES: Record<Platform, { bg: string; text: string; dot: string; label: string }> = {
  facebook:  { bg: "bg-blue-50",  text: "text-blue-700",  dot: "bg-blue-500",  label: "Facebook"  },
  instagram: { bg: "bg-pink-50",  text: "text-pink-700",  dot: "bg-pink-500",  label: "Instagram" },
  linkedin:  { bg: "bg-sky-50",   text: "text-sky-700",   dot: "bg-sky-500",   label: "LinkedIn"  },
};

function PostTile({
  post,
  token,
  onUpdate,
}: {
  post: ReviewPost;
  token: string;
  onUpdate: (id: string, patch: Partial<ReviewPost>) => void;
}) {
  const [comment, setComment]   = useState(post.client_comment ?? "");
  const [approved, setApproved] = useState(post.client_approved);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const style = PLATFORM_STYLES[post.platform] ?? PLATFORM_STYLES.facebook;

  const save = useCallback(
    async (patch: { comment?: string; approved?: boolean }) => {
      setSaving(true);
      try {
        await fetch(`/api/review/${token}/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        onUpdate(post.id, {
          ...(patch.comment !== undefined ? { client_comment: patch.comment || null } : {}),
          ...(patch.approved !== undefined ? { client_approved: patch.approved } : {}),
        });
      } finally {
        setSaving(false);
      }
    },
    [token, post.id, onUpdate]
  );

  const handleApprove = () => {
    const next = !approved;
    setApproved(next);
    void save({ approved: next });
  };

  const handleCommentBlur = () => {
    if (comment !== (post.client_comment ?? "")) {
      void save({ comment });
    }
  };

  const CONTENT_LIMIT = 200;
  const isLong = post.content.length > CONTENT_LIMIT;
  const displayContent = isLong && !expanded
    ? post.content.slice(0, CONTENT_LIMIT) + "…"
    : post.content;

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden transition-all",
      approved ? "border-green-300 shadow-green-100" : "border-slate-200"
    )}>
      {/* Platform header */}
      <div className={cn("flex items-center gap-2 px-4 py-2.5", style.bg)}>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />
        <span className={cn("text-xs font-bold tracking-wide uppercase", style.text)}>
          {style.label}
        </span>
        {post.scheduled_for && (
          <>
            <span className={cn("text-xs opacity-50", style.text)}>·</span>
            <span className={cn("text-xs font-medium opacity-70", style.text)}>
              {format(new Date(post.scheduled_for), "d MMM yyyy")}
            </span>
          </>
        )}
        {saving && <Loader2 className="h-3 w-3 animate-spin ml-auto text-slate-400" />}
        {approved && !saving && (
          <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />
        )}
      </div>

      {/* Media */}
      {post.video_url ? (
        <video src={post.video_url} controls className="w-full aspect-video object-cover bg-black" />
      ) : post.image_url ? (
        <img src={post.image_url} alt="post visual" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-slate-50 flex items-center justify-center text-slate-300 text-sm">
          No image yet
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {displayContent}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-violet-500 hover:text-violet-700 mt-1 font-medium"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Comment */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="font-medium">Your comment</span>
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={handleCommentBlur}
          placeholder="Leave feedback or notes for this post…"
          rows={3}
          className="w-full text-sm text-slate-700 placeholder:text-slate-300 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all"
        />
      </div>

      {/* Approve */}
      <div className="px-4 pb-4">
        <button
          onClick={handleApprove}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all select-none",
            approved
              ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          )}
        >
          <span className={cn(
            "w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all",
            approved ? "bg-green-500 border-green-500" : "border-slate-300"
          )}>
            {approved && <Check className="w-3 h-3 text-white" />}
          </span>
          {approved ? "Approved ✓" : "Approve this post"}
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [brand, setBrand]   = useState<ReviewBrand | null>(null);
  const [posts, setPosts]   = useState<ReviewPost[]>([]);
  const [label, setLabel]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setBrand(data.brand);
        setPosts(data.posts);
        setLabel(data.label ?? null);
      })
      .catch(() => setError("Could not load review page."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpdate = useCallback((id: string, patch: Partial<ReviewPost>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const approvedCount = posts.filter(p => p.client_approved).length;
  const total = posts.length;
  const allApproved = total > 0 && approvedCount === total;

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Link unavailable</h2>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-lg object-contain bg-slate-100" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: brand?.primary_color ?? "#8b5cf6" }}
              >
                {brand?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{brand?.name}</p>
              {label && <p className="text-xs text-slate-400">{label}</p>}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-700">
                {approvedCount} / {total} approved
              </span>
              <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: total ? `${(approvedCount / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            {allApproved && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" /> All approved!
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Review your upcoming posts
          </h1>
          <p className="text-sm text-slate-500">
            Leave comments and tick the box to approve each post. Your feedback saves automatically.
          </p>
        </div>

        {/* Post grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium">No posts to review yet</p>
            <p className="text-sm mt-1">Check back once content has been scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <PostTile
                key={post.id}
                post={post}
                token={token}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        {/* Submit / Done banner */}
        {total > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            {submitted ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                Thank you! Your feedback has been sent.
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSubmitted(true)}
                  className="px-8 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-200 transition-all"
                >
                  {allApproved ? "✓ Submit — all approved" : `Submit feedback (${approvedCount}/${total} approved)`}
                </button>
                <p className="text-xs text-slate-400">Comments and approvals save automatically as you go.</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-slate-300">
          Powered by <span className="font-semibold text-slate-400">BrandFlow</span>
        </p>
      </footer>
    </div>
  );
}
