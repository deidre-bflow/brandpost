"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "@/components/PlatformIcons";
import type { Brand, Platform } from "@/lib/types";
import { format, addDays } from "date-fns";

const PLATFORM_OPTIONS: { value: Platform; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { value: "facebook",  label: "Facebook",  icon: FacebookIcon,  color: "bg-blue-600" },
  { value: "instagram", label: "Instagram", icon: InstagramIcon, color: "bg-gradient-to-br from-pink-500 to-purple-600" },
  { value: "linkedin",  label: "LinkedIn",  icon: LinkedInIcon,  color: "bg-sky-700" },
];

export default function GeneratePage() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const supabase       = createClient();
  const initialBrandId = searchParams.get("brandId") ?? "";

  const [brands,     setBrands]     = useState<Brand[]>([]);
  const [brandId,    setBrandId]    = useState(initialBrandId);
  const [platforms,  setPlatforms]  = useState<Platform[]>(["facebook", "instagram", "linkedin"]);
  const [startDate,  setStartDate]  = useState(format(new Date(), "yyyy-MM-dd"));
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState(false);
  const [postCount,  setPostCount]  = useState(0);

  useEffect(() => {
    supabase.from("brands").select("id, name, primary_color, logo_url").order("name")
      .then(({ data }) => setBrands((data ?? []) as Brand[]));
  }, []);

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (!brandId) { setError("Select a brand first"); return; }
    if (!platforms.length) { setError("Select at least one platform"); return; }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, platforms, startDate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostCount(data.count);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 max-w-lg">
        <div className="bg-white border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Content Generated!</h2>
          <p className="text-slate-500 mb-1">{postCount} posts created across {platforms.length} platform{platforms.length !== 1 ? "s" : ""}</p>
          <p className="text-slate-500 text-sm mb-6">Starting {format(new Date(startDate), "d MMM yyyy")} — view and approve in the Calendar</p>
          <div className="flex gap-3">
            <button onClick={() => { setDone(false); setBrandId(""); setPlatforms(["facebook","instagram","linkedin"]); }}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              Generate More
            </button>
            <button onClick={() => router.push("/calendar")}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-500">
              View Calendar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Generate Content</h1>
        <p className="text-slate-500 mt-1">AI creates 30 days of platform-optimised posts in one click</p>
      </div>

      <div className="space-y-6">
        {/* Brand selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Brand *</label>
          {brands.length === 0 ? (
            <p className="text-sm text-slate-400">No brands yet — <a href="/brands/new" className="text-violet-600 underline">add one first</a></p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {brands.map(b => (
                <button key={b.id} type="button" onClick={() => setBrandId(b.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    brandId === b.id
                      ? "border-violet-400 bg-violet-50 ring-1 ring-violet-400"
                      : "border-slate-200 bg-white hover:border-violet-200"
                  }`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
                    style={{ backgroundColor: b.primary_color ?? "#8b5cf6" }}>
                    {b.name[0]}
                  </div>
                  <span className="font-semibold text-slate-900">{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Platform selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Platforms *</label>
          <div className="flex gap-3">
            {PLATFORM_OPTIONS.map(({ value, label, icon: Icon, color }) => (
              <button key={value} type="button" onClick={() => togglePlatform(value)}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                  platforms.includes(value)
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-400"
                    : "border-slate-200 bg-white hover:border-violet-200"
                }`}>
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </button>
            ))}
          </div>
          {platforms.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Will generate {30 * platforms.length} posts ({30} per platform)
            </p>
          )}
        </div>

        {/* Start date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Calendar Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <p className="text-xs text-slate-400 mt-1">
            Posts will be scheduled daily from {format(new Date(startDate), "d MMM")} to {format(addDays(new Date(startDate), 29), "d MMM yyyy")}
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={generating || !brandId || !platforms.length}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-base hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-violet-200">
          {generating
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating with Claude AI…</>
            : <><Sparkles className="h-5 w-5" /> Generate 30 Days of Content</>
          }
        </button>

        {generating && (
          <p className="text-center text-sm text-slate-400 animate-pulse">
            Claude is writing {30 * platforms.length} posts… this takes ~30 seconds
          </p>
        )}
      </div>
    </div>
  );
}
