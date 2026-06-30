"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, ImageIcon, Check, Loader2, Copy, Filter, Upload, Share2, X, Link2, Film, Plus, Wand2, Trash2 } from "lucide-react";
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
  const [generateError, setGenerateError]   = useState<{ [postId: string]: string }>({});
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [removingImg, setRemovingImg]       = useState<string | null>(null);
  const [shareModal, setShareModal]         = useState(false);
  const [shareUrl, setShareUrl]             = useState<string | null>(null);
  const [shareLoading, setShareLoading]     = useState(false);
  const [shareCopied, setShareCopied]       = useState(false);

  // New post form
  const [showNewPost,    setShowNewPost]    = useState(false);
  const [newBrandId,     setNewBrandId]     = useState("");
  const [newPlatform,    setNewPlatform]    = useState<Platform>("facebook");
  const [newTime,        setNewTime]        = useState("08:00");
  const [newPrompt,      setNewPrompt]      = useState("");
  const [newProvider,    setNewProvider]    = useState<"ideogram" | "higgsfield">("ideogram");
  const [newRefUrl,      setNewRefUrl]      = useState<string | null>(null);
  const [savingNew,      setSavingNew]      = useState(false);
  const [newError,       setNewError]       = useState<string | null>(null);

  // Brand assets (loaded when a brand is selected)
  const [brandAssets,    setBrandAssets]    = useState<{ name: string; url: string }[]>([]);
  const [genRefUrl,      setGenRefUrl]      = useState<{ [postId: string]: string | null }>({});
  const [showRefPicker,  setShowRefPicker]  = useState<string | null>(null); // postId
  const [lightboxUrl,    setLightboxUrl]    = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),   "yyyy-MM-dd");

    const [{ data: postsData }, { data: brandsData }] = await Promise.all([
      supabase
        .from("posts")
        .select("*, image_urls, brand:brands(id, name, primary_color, logo_url)")
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

  const handleGenerateImage = async (post: Post, refUrl?: string | null) => {
    if (!post.image_prompt) return;
    setGeneratingImg(post.id);
    setShowRefPicker(null);
    setGenerateError(prev => { const n = { ...prev }; delete n[post.id]; return n; });
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          prompt: post.image_prompt,
          referenceUrl: refUrl ?? genRefUrl[post.id] ?? null,
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_url: data.image_url } : p));
      } else if (data.error) {
        setGenerateError(prev => ({ ...prev, [post.id]: data.error }));
      }
    } catch (e: any) {
      setGenerateError(prev => ({ ...prev, [post.id]: e.message ?? "Generation failed" }));
    } finally {
      setGeneratingImg(null);
    }
  };

  const handleUploadMedia = (post: Post, replace = false) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      setUploadingMedia(post.id);
      try {
        // If replacing, clear first
        if (replace) {
          await supabase.from("posts").update({ image_urls: [], image_url: null }).eq("id", post.id);
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_urls: [], image_url: null } : p));
        }
        // Upload files one by one — each appends to the array server-side
        let latestUrls: string[] = [];
        for (const file of files) {
          const form = new FormData();
          form.append("file", file);
          const res  = await fetch(`/api/posts/${post.id}/upload-media`, { method: "POST", body: form });
          const data = await res.json();
          if (data.image_urls) latestUrls = data.image_urls;
          else if (data.video_url) {
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, video_url: data.video_url } : p));
            return;
          }
        }
        if (latestUrls.length) {
          setPosts(prev => prev.map(p => p.id === post.id
            ? { ...p, image_url: latestUrls[0], image_urls: latestUrls }
            : p));
        }
      } finally {
        setUploadingMedia(null);
      }
    };
    input.click();
  };

  const handleRemoveImage = async (post: Post, index: number) => {
    setRemovingImg(post.id);
    try {
      const newUrls = (post.image_urls ?? []).filter((_, i) => i !== index);
      await supabase.from("posts").update({
        image_urls: newUrls,
        image_url: newUrls[0] ?? null,
      }).eq("id", post.id);
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, image_urls: newUrls, image_url: newUrls[0] ?? null }
        : p));
    } finally {
      setRemovingImg(null);
    }
  };

  const handleShare = async () => {
    const brandId = selectedBrand === "all" ? null : selectedBrand;
    // Collect IDs of posts visible in the current month view (filtered by brand if selected)
    const visiblePostIds = posts
      .filter(p => !brandId || p.brand_id === brandId)
      .map(p => p.id);

    if (!brandId) {
      setShareModal(true);
      setShareUrl(null);
      return;
    }
    setShareModal(true);
    setShareUrl(null);
    setShareLoading(true);
    const monthLabel = format(currentMonth, "MMMM yyyy");
    try {
      const res  = await fetch("/api/review-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, postIds: visiblePostIds, label: monthLabel }),
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

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").delete().eq("id", postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (selectedDay && postsForDay(selectedDay).length === 1) setSelectedDay(null);
  };

  const loadBrandAssets = async (brandId: string) => {
    if (!brandId) { setBrandAssets([]); return; }
    const res = await fetch(`/api/brands/${brandId}/assets`);
    const data = await res.json();
    setBrandAssets(data.assets ?? []);
  };

  const openNewPost = () => {
    const brandId = selectedBrand !== "all" ? selectedBrand : (brands[0]?.id ?? "");
    setNewBrandId(brandId);
    setNewPlatform("facebook");
    setNewTime("08:00");
    setNewPrompt("");
    setNewProvider("ideogram");
    setNewRefUrl(null);
    setNewError(null);
    setShowNewPost(true);
    loadBrandAssets(brandId);
  };

  const handleSaveNewPost = async () => {
    if (!newBrandId) { setNewError("Select a brand"); return; }
    if (!newPrompt.trim()) { setNewError("Describe the scene or product for this post"); return; }
    if (!selectedDay) return;
    setSavingNew(true);
    setNewError(null);

    try {
      // Auto-generate caption + refined image prompt from the scene description
      const capRes = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: newBrandId, platform: newPlatform, imagePrompt: newPrompt.trim(), referenceUrl: newRefUrl }),
      });
      const capData = await capRes.json();
      if (!capRes.ok) throw new Error(capData.error ?? "Caption generation failed");

      const [hours, minutes] = newTime.split(":").map(Number);
      const scheduledFor = new Date(selectedDay);
      scheduledFor.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase.from("posts").insert({
        brand_id:       newBrandId,
        platform:       newPlatform,
        content:        capData.content,
        image_prompt:   capData.image_prompt,
        image_provider: newProvider,
        scheduled_for:  scheduledFor.toISOString(),
        status:         "draft",
        image_urls:     [],
      }).select("*, brand:brands(id, name, primary_color, logo_url)").single();

      if (error) throw new Error(error.message);
      setPosts(prev => [...prev, data as Post]);
      setShowNewPost(false);
    } catch (e: any) {
      setNewError(e.message ?? "Something went wrong");
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X className="h-7 w-7" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
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
                            const brandPostIds = posts.filter(p => p.brand_id === b.id).map(p => p.id);
                            const monthLabel = format(currentMonth, "MMMM yyyy");
                            const res  = await fetch("/api/review-links", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ brandId: b.id, postIds: brandPostIds, label: monthLabel }),
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
                        <div key={p.id} className={cn("text-[10px] rounded px-1 py-0.5 flex items-center gap-1 border group/chip", PLATFORM_COLORS[p.platform])}>
                          <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate flex-1">{p.status === "approved" ? "✓ " : ""}{p.brand?.name ?? ""}</span>
                          <button
                            onClick={(e) => handleDeletePost(p.id, e)}
                            className="opacity-0 group-hover/chip:opacity-100 transition-opacity flex-shrink-0 hover:text-red-600"
                            title="Delete post"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
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
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{format(selectedDay, "EEEE, d MMMM yyyy")}</p>
              <p className="text-xs text-slate-500">{selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? "s" : ""} scheduled</p>
            </div>
            <button
              onClick={openNewPost}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Post
            </button>
          </div>

          {/* Inline new post form */}
          {showNewPost && (
            <div className="border-b border-slate-100 bg-violet-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-violet-800 uppercase tracking-widest">New Post</p>
                <button onClick={() => setShowNewPost(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Brand + Platform row */}
              <div className="flex gap-2">
                <select value={newBrandId} onChange={e => { setNewBrandId(e.target.value); setNewRefUrl(null); loadBrandAssets(e.target.value); }}
                  className="flex-1 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="">Brand…</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value as Platform)}
                  className="px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              {/* Scene / product description */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                  <Wand2 className="h-3 w-3" /> What is this post about?
                </label>
                <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                  placeholder="e.g. SDLG E660FL Excavator working on a South African construction site at golden hour…"
                  rows={3}
                  className="w-full px-2.5 py-2 border border-violet-200 bg-white rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <p className="text-[10px] text-slate-400 mt-1">Claude writes the caption + hashtags. Ideogram generates the image.</p>
              </div>

              {/* Reference image picker */}
              {true && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Reference image (pick a machine)
                  </label>
                  {brandAssets.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No assets uploaded for this brand yet</p>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {brandAssets.map(a => (
                        <button key={a.name} type="button"
                          onClick={() => setNewRefUrl(newRefUrl === a.url ? null : a.url)}
                          className={cn(
                            "relative rounded-lg overflow-hidden border-2 transition-all w-12 h-12",
                            newRefUrl === a.url ? "border-violet-500 ring-2 ring-violet-300" : "border-slate-200 hover:border-violet-300"
                          )}
                          title={a.name.replace(/^\d+-/, "").replace(/\.[^.]+$/, "")}
                        >
                          <img src={a.url} alt="" className="w-full h-full object-cover" />
                          {newRefUrl === a.url && (
                            <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-violet-700" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {newRefUrl && <p className="text-[10px] text-violet-600 font-semibold mt-1">✓ Reference selected — Ideogram will remix this machine into the scene</p>}
                </div>
              )}

              {/* Provider toggle */}
              <div className="flex gap-2">
                {(["ideogram", "higgsfield"] as const).map(p => (
                  <button key={p} type="button"
                    onClick={() => setNewProvider(p)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all capitalize",
                      newProvider === p
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
                    )}>
                    {p}
                  </button>
                ))}
              </div>

              {newError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{newError}</p>}

              <button onClick={handleSaveNewPost} disabled={savingNew || !newPrompt.trim()}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {savingNew
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing caption…</>
                  : <><Wand2 className="h-3.5 w-3.5" /> Generate &amp; Create Post</>}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedDayPosts.length === 0 && !showNewPost ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 mb-3">No posts on this day</p>
                <button onClick={openNewPost}
                  className="flex items-center gap-1.5 mx-auto px-4 py-2 border-2 border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-600 text-xs font-semibold rounded-lg transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Create a post
                </button>
              </div>
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
                        <video src={post.video_url} controls className="w-full aspect-square object-cover bg-black" />
                        <button onClick={() => handleUploadMedia(post, true)} disabled={uploadingMedia === post.id}
                          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold">
                          {uploadingMedia === post.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</> : <><Upload className="h-3 w-3" /> Replace</>}
                        </button>
                      </div>
                    ) : (post.image_urls?.length > 0 || post.image_url) ? (
                      <div className="p-2 space-y-2">
                        {/* Image strip */}
                        <div className="flex gap-1.5 flex-wrap">
                          {(post.image_urls?.length > 0 ? post.image_urls : [post.image_url!]).map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt={`image ${i + 1}`}
                                onClick={() => setLightboxUrl(url)}
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity" />
                              <button
                                onClick={() => handleRemoveImage(post, i)}
                                disabled={removingImg === post.id}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                              {i === 0 && post.image_urls?.length > 1 && (
                                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded">1st</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Carousel label */}
                        {(post.image_urls?.length ?? 0) > 1 && (
                          <p className="text-[10px] text-violet-600 font-semibold">
                            📎 {post.image_urls.length}-image carousel
                          </p>
                        )}
                        {/* Add more / replace */}
                        <div className="flex gap-1.5">
                          <button onClick={() => handleUploadMedia(post, false)} disabled={uploadingMedia === post.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-semibold disabled:opacity-50">
                            {uploadingMedia === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Upload className="h-3 w-3" /> Add image</>}
                          </button>
                          <button onClick={() => handleUploadMedia(post, true)} disabled={uploadingMedia === post.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold disabled:opacity-50">
                            Replace all
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-slate-50 flex flex-col items-center justify-center gap-2.5 px-4">
                        <div className="flex flex-col gap-2 w-full items-center">
                            {/* Reference image strip */}
                            {showRefPicker === post.id ? (
                              <div className="w-full bg-violet-50 rounded-xl p-3 space-y-2">
                                <p className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">Pick reference machine</p>
                                <div className="flex gap-1.5 flex-wrap justify-center">
                                  {brandAssets.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">No assets for this brand</p>
                                  ) : brandAssets.map(a => (
                                    <button key={a.name} type="button"
                                      onClick={() => setGenRefUrl(prev => ({ ...prev, [post.id]: a.url }))}
                                      className={cn(
                                        "relative rounded-lg overflow-hidden border-2 transition-all w-12 h-12",
                                        genRefUrl[post.id] === a.url ? "border-violet-500 ring-2 ring-violet-300" : "border-slate-200 hover:border-violet-300"
                                      )}
                                      title={a.name.replace(/^\d+-/, "").replace(/\.[^.]+$/, "")}
                                    >
                                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                                      {genRefUrl[post.id] === a.url && (
                                        <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                                          <Check className="h-3 w-3 text-violet-700" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleGenerateImage(post)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg">
                                    <ImageIcon className="h-3 w-3" />
                                    {genRefUrl[post.id] ? "Remix selected" : "Generate (no ref)"}
                                  </button>
                                  <button onClick={() => setShowRefPicker(null)}
                                    className="px-2 py-1.5 border border-slate-200 text-slate-500 text-[10px] rounded-lg hover:bg-slate-50">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={async () => {
                                  const brandId = post.brand_id;
                                  const res = await fetch(`/api/brands/${brandId}/assets`);
                                  const data = await res.json();
                                  setBrandAssets(data.assets ?? []);
                                  setShowRefPicker(post.id);
                                }}
                                disabled={generatingImg === post.id || uploadingMedia === post.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-50">
                                {generatingImg === post.id
                                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                                  : <><ImageIcon className="h-3.5 w-3.5" /> Generate Image
                                      <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                        {post.image_provider === "higgsfield" ? "Higgsfield" : "Ideogram"}
                                      </span>
                                    </>}
                              </button>
                            )}
                        </div>
                        {generateError[post.id] && (
                          <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 text-center w-full">
                            {generateError[post.id]}
                          </p>
                        )}
                        <button onClick={() => handleUploadMedia(post, false)}
                          disabled={generatingImg === post.id || uploadingMedia === post.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50">
                          {uploadingMedia === post.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                            : <><Upload className="h-3.5 w-3.5" /> Upload Image(s)</>}
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-3">
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex gap-2">
                      <button onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-1.5 border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete post">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
