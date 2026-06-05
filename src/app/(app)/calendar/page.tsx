"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, ImageIcon, Check, Loader2, Copy, Filter, Upload, Share2, X, Link2 } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "@/components/PlatformIcons";
import type { Post, Brand, Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORM_COLORS: Record<Platform, string> = {
  facebook:  "bg-blue-100 text-blue-700 border-blue-200",
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  linkedin:  "bg-sky-100 text-sky-700 border-sky-200",
};
const PLATFORM_ICONS: Record<Platform, React.ComponentType<any>> = {
  facebook: FacebookIcon, instagram: InstagramIcon, linkedin: LinkedInIcon,
};

export default function CalendarPage() {
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts,         setPosts]        = useState<Post[]>([]);
  const [brands,        setBrands]       = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand]= useState<string>("all");
  const [selectedDay,   setSelectedDay]  = useState<Date | null>(null);
  const [loading,       setLoading]      = useState(true);
  const [generatingImg, setGeneratingImg]   = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [shareModal, setShareModal]         = useState(false);
  const [shareUrl, setShareUrl]             = useState<string | null>(null);
  const [shareLoading, setShareLoading]     = useState(false);
  const [shareCopied, setShareCopied]       = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),   "yyyy-MM-dd");

    const [{ data: postsData }, { data: brandsData }] = await Promise.all([
      supabase
        .from("posts")
        .select("*, brand:brands(id, name, primary_color, logo_url)")
        .gte("scheduled_for", start)
        .lte("scheduled_for", end + "T23:59:59")
        .order("scheduled_for"),
      supabase.from("brands").select("id, name, primary_color").order("name"),
    ]);
    setPosts((postsData ?? []) as Post[]);
    setBrands((brandsData ?? []) as Brand[]);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => { void loadData(); }, [loadData]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = (days[0]?.getDay() + 6) % 7; // Monday start

  const postsForDay = (day: Date) =>
    posts.filter(p => {
      if (!p.scheduled_for) return false;
      const match = isSameDay(new Date(p.scheduled_for), day);
      if (!match) return false;
      if (selectedBrand !== "all" && p.brand_id !== selectedBrand) return false;
      return true;
    });

  const selectedDayPosts = selectedDay ? postsForDay(selectedDay) : [];

  const handleApprove = async (post: Post) => {
    const newStatus = post.status === "approved" ? "draft" : "approved";
    await supabase.from("posts").update({ status: newStatus }).eq("id", post.id);
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
  };

  const handleGenerateImage = async (post: Post) => {
    if (!post.image_prompt) return;
    setGeneratingImg(post.id);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, prompt: post.image_prompt }),
      });
      const data = await res.json();
      if (data.image_url) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_url: data.image_url } : p));
      }
    } finally {
      setGeneratingImg(null);
    }
  };

  const handleUploadMedia = (post: Post) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingMedia(post.id);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/posts/${post.id}/upload-media`, {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (data.image_url) {
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_url: data.image_url } : p));
        } else if (data.video_url) {
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, video_url: data.video_url } : p));
        }
      } finally {
        setUploadingMedia(null);
      }
    };
    input.click();
  };

  const handleShare = async () => {
    const brandId = selectedBrand === "all" ? null : selectedBrand;
    if (!brandId) {
      setShareModal(true);
      setShareUrl(null);
      return;
    }
    setShareModal(true);
    setShareUrl(null);
    setShareLoading(true);
    try {
      const res  = await fetch("/api/review-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      if (data.token) {
        setShareUrl(`${window.location.origin}/review/${data.token}`);
      }
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex h-full">
      {/* Calendar panel */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">
              {format(currentMonth, "MMMM yyyy")}
            </h1>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Brand filter + Share */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value="all">All brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share for Review
            </button>
          </div>

          {/* Share modal */}
          {shareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Share for client review</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Send this link to your client — no login required.</p>
                  </div>
                  <button onClick={() => { setShareModal(false); setShareUrl(null); }}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedBrand === "all" && !shareUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Select a brand to create a review link for:</p>
                    <div className="space-y-2">
                      {brands.map(b => (
                        <button
                          key={b.id}
                          onClick={async () => {
                            setShareLoading(true);
                            const res  = await fetch("/api/review-links", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ brandId: b.id }),
                            });
                            const data = await res.json();
                            if (data.token) setShareUrl(`${window.location.origin}/review/${data.token}`);
                            setShareLoading(false);
                          }}
                          disabled={shareLoading}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-sm font-medium text-slate-700 transition-all text-left disabled:opacity-50"
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: (b as any).primary_color ?? "#8b5cf6" }} />
                          {b.name}
                          {shareLoading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : shareLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Creating link…</span>
                  </div>
                ) : shareUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600 truncate flex-1">{shareUrl}</span>
                    </div>
                    <button
                      onClick={handleCopyShareUrl}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                        shareCopied
                          ? "bg-green-500 text-white"
                          : "bg-violet-600 hover:bg-violet-700 text-white"
                      )}
                    >
                      {shareCopied
                        ? <><Check className="h-4 w-4" /> Copied!</>
                        : <><Copy className="h-4 w-4" /> Copy link</>
                      }
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Your client can view and approve all draft posts — no account needed.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} className="text-xs font-semibold text-slate-400 text-center py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayPosts = postsForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "min-h-[72px] rounded-xl border p-1.5 cursor-pointer transition-all",
                    isToday(day) ? "border-violet-400 bg-violet-50" : "border-slate-100 bg-white hover:border-violet-200",
                    isSelected ? "ring-2 ring-violet-400 border-violet-400" : "",
                  )}
                >
                  <p className={cn("text-xs font-bold mb-1 text-center",
                    isToday(day) ? "text-violet-600" : "text-slate-600")}>
                    {format(day, "d")}
                  </p>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map(p => {
                      const Icon = PLATFORM_ICONS[p.platform];
                      return (
                        <div key={p.id} className={cn("text-[10px] rounded px-1 py-0.5 flex items-center gap-1 border", PLATFORM_COLORS[p.platform])}>
                          <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{p.status === "approved" ? "✓ " : ""}{p.brand?.name ?? ""}</span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center">+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post detail panel */}
      {selectedDay && (
        <div className="w-96 border-l border-slate-200 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-bold text-slate-900">{format(selectedDay, "EEEE, d MMMM yyyy")}</p>
            <p className="text-xs text-slate-500">{selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? "s" : ""} scheduled</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No posts on this day</p>
            ) : (
              selectedDayPosts.map(post => {
                const Icon = PLATFORM_ICONS[post.platform];
                return (
                  <div key={post.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Platform header */}
                    <div className={cn("flex items-center gap-2 px-3 py-2 text-xs font-bold border-b", PLATFORM_COLORS[post.platform])}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="capitalize">{post.platform}</span>
                      {post.brand && (
                        <>
                          <span className="text-slate-300 mx-1">·</span>
                          <span>{post.brand.name}</span>
                        </>
                      )}
                    </div>

                    {/* Media */}
                    {post.video_url ? (
                      <div className="relative">
                        <video
                          src={post.video_url}
                          controls
                          className="w-full aspect-square object-cover bg-black"
                        />
                        <button
                          onClick={() => handleUploadMedia(post)}
                          disabled={uploadingMedia === post.id}
                          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold transition-colors"
                        >
                          {uploadingMedia === post.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                            : <><Upload className="h-3 w-3" /> Replace</>
                          }
                        </button>
                      </div>
                    ) : post.image_url ? (
                      <div className="relative">
                        <img src={post.image_url} alt="post image" className="w-full aspect-square object-cover" />
                        <button
                          onClick={() => handleUploadMedia(post)}
                          disabled={uploadingMedia === post.id}
                          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold transition-colors"
                        >
                          {uploadingMedia === post.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                            : <><Upload className="h-3 w-3" /> Replace</>
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-slate-50 flex flex-col items-center justify-center gap-2.5">
                        <button
                          onClick={() => handleGenerateImage(post)}
                          disabled={generatingImg === post.id || uploadingMedia === post.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {generatingImg === post.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                            : <>
                                <ImageIcon className="h-3.5 w-3.5" />
                                Generate Image
                                <span className={cn(
                                  "ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                  post.image_provider === "higgsfield"
                                    ? "bg-green-200 text-green-800"
                                    : "bg-orange-100 text-orange-700"
                                )}>
                                  {post.image_provider === "higgsfield" ? "Higgsfield" : "Ideogram"}
                                </span>
                              </>
                          }
                        </button>
                        <button
                          onClick={() => handleUploadMedia(post)}
                          disabled={generatingImg === post.id || uploadingMedia === post.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {uploadingMedia === post.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                            : <><Upload className="h-3.5 w-3.5" /> Upload Media</>
                          }
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-3">
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex gap-2">
                      <button onClick={() => handleCopy(post.content)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                      <button onClick={() => handleApprove(post)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          post.status === "approved"
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "border border-green-300 text-green-700 hover:bg-green-50"
                        )}>
                        <Check className="h-3 w-3" />
                        {post.status === "approved" ? "Approved ✓" : "Approve"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
