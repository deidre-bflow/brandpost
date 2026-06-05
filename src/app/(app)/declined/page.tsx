"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  AlertCircle, MessageSquare, CalendarDays, Share2,
  Loader2, Check, Copy, X, Link2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/types";

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  facebook:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "Facebook"  },
  instagram: { bg: "bg-pink-100",  text: "text-pink-700",  label: "Instagram" },
  linkedin:  { bg: "bg-sky-100",   text: "text-sky-700",   label: "LinkedIn"  },
};

interface DeclinedPost {
  id: string;
  platform: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  scheduled_for: string | null;
  client_comment: string | null;
  brand: { name: string; primary_color: string | null; logo_url: string | null } | null;
  brand_id: string;
}

export default function DeclinedPage() {
  const supabase = createClient();
  const [posts, setPosts]       = useState<DeclinedPost[]>([]);
  const [brands, setBrands]     = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [loading, setLoading]   = useState(true);

  // Re-share modal state
  const [shareModal, setShareModal]   = useState(false);
  const [shareUrl, setShareUrl]       = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareBrandId, setShareBrandId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: postsData }, { data: brandsData }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, platform, content, image_url, video_url, scheduled_for, client_comment, brand_id, brand:brands(name, primary_color, logo_url)")
        .eq("client_approved", false)
        .not("client_comment", "is", null)
        .order("updated_at", { ascending: false }),
      supabase.from("brands").select("id, name, primary_color").order("name"),
    ]);
    setPosts((postsData ?? []) as unknown as DeclinedPost[]);
    setBrands((brandsData ?? []) as Brand[]);
    setLoading(false);
  };

  const filtered = selectedBrand === "all"
    ? posts
    : posts.filter(p => p.brand_id === selectedBrand);

  // Group by brand for re-share
  const brandIds = [...new Set(filtered.map(p => p.brand_id))];

  const handleReshare = async (brandId: string) => {
    const brandPosts = filtered.filter(p => p.brand_id === brandId);
    const postIds    = brandPosts.map(p => p.id);
    const brandName  = (brandPosts[0]?.brand as any)?.name ?? "Brand";

    setShareBrandId(brandId);
    setShareModal(true);
    setShareUrl(null);
    setShareLoading(true);

    try {
      const res  = await fetch("/api/review-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          postIds,
          label: `Re-review — ${format(new Date(), "MMMM yyyy")}`,
        }),
      });
      const data = await res.json();
      if (data.token) setShareUrl(`${window.location.origin}/review/${data.token}`);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const total = filtered.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Needs Changes</h1>
          </div>
          <p className="text-sm text-slate-500">
            {total} post{total !== 1 ? "s" : ""} with client feedback — not yet approved
          </p>
        </div>

        {/* Brand filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="all">All brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Per-brand re-share bar */}
      {brandIds.length > 0 && (
        <div className="mb-6 space-y-2">
          {brandIds.map(bid => {
            const brandName  = (filtered.find(p => p.brand_id === bid)?.brand as any)?.name ?? "Brand";
            const brandColor = (filtered.find(p => p.brand_id === bid)?.brand as any)?.primary_color ?? "#8b5cf6";
            const count      = filtered.filter(p => p.brand_id === bid).length;
            return (
              <div key={bid} className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0" style={{ background: brandColor }}>
                  {brandName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 text-sm">{brandName}</span>
                  <span className="text-slate-400 text-xs ml-2">{count} post{count !== 1 ? "s" : ""} needing changes</span>
                </div>
                <button
                  onClick={() => handleReshare(bid)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0"
                >
                  <Share2 className="h-3 w-3" /> Re-share for Review
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No posts needing changes</p>
          <p className="text-sm text-slate-300 mt-1">All client feedback has been resolved</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(post => {
            const brand  = post.brand as any;
            const pStyle = PLATFORM_STYLES[post.platform] ?? { bg: "bg-slate-100", text: "text-slate-600", label: post.platform };

            return (
              <div key={post.id} className="flex flex-col bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

                {/* Platform + brand */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                    {pStyle.label}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white font-black text-[9px]" style={{ background: brand?.primary_color ?? "#8b5cf6" }}>
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

                {/* Client comment — highlighted */}
                {post.client_comment && (
                  <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Client feedback</span>
                    </div>
                    <p className="text-xs text-amber-800 italic leading-relaxed">"{post.client_comment}"</p>
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 pb-4 border-t border-amber-100 pt-3 flex items-center justify-between">
                  {post.scheduled_for && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(post.scheduled_for), "d MMM yyyy")}
                    </div>
                  )}
                  <a
                    href="/calendar"
                    className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 ml-auto"
                  >
                    Fix in Calendar <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Re-share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Re-share for client review</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  This link shows <strong>only the declined posts</strong> — client can re-review and approve.
                </p>
              </div>
              <button onClick={() => { setShareModal(false); setShareUrl(null); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {shareLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Creating link…
              </div>
            ) : shareUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 truncate flex-1">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                    shareCopied ? "bg-green-500 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
                  )}
                >
                  {shareCopied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy link</>}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  Once the client approves, posts will move to Approved automatically.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
