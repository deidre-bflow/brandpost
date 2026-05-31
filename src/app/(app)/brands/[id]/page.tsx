"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Globe, Wand2, Trash2 } from "lucide-react";
import type { Tone } from "@/lib/types";

const TONES: Tone[] = ["professional", "casual", "humorous", "inspirational", "educational", "bold"];
const INDUSTRIES = ["Construction", "Mining", "Agriculture", "Transport & Logistics", "Real Estate", "Retail", "Hospitality", "Technology", "Healthcare", "Finance", "Marketing", "Other"];

export default function EditBrandPage() {
  const router  = useRouter();
  const params  = useParams();
  const id      = params.id as string;
  const supabase = createClient();

  const [loading,        setLoading]        = useState(true);
  const [name,           setName]           = useState("");
  const [websiteUrl,     setWebsiteUrl]     = useState("");
  const [logoUrl,        setLogoUrl]        = useState("");
  const [primaryColor,   setPrimaryColor]   = useState("#8b5cf6");
  const [secondaryColor, setSecondaryColor] = useState("#a78bfa");
  const [industry,       setIndustry]       = useState("");
  const [tone,           setTone]           = useState<Tone>("professional");
  const [audience,       setAudience]       = useState("");
  const [pillars,        setPillars]        = useState<string[]>(["", "", ""]);
  const [products,       setProducts]       = useState<string[]>(["", ""]);
  const [productImages,  setProductImages]  = useState<Record<string, string>>({});
  const [notes,          setNotes]          = useState("");
  const [scraping,       setScraping]       = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    supabase.from("brands").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { setError("Brand not found"); setLoading(false); return; }
      setName(data.name ?? "");
      setWebsiteUrl(data.website_url ?? "");
      setLogoUrl(data.logo_url ?? "");
      setPrimaryColor(data.primary_color ?? "#8b5cf6");
      setSecondaryColor(data.secondary_color ?? "#a78bfa");
      setIndustry(data.industry ?? "");
      setTone((data.tone as Tone) ?? "professional");
      setAudience(data.target_audience ?? "");
      setPillars(data.content_pillars?.length ? data.content_pillars : ["", "", ""]);
      setProducts(data.products?.length ? data.products : ["", ""]);
      setProductImages(data.product_images ?? {});
      setNotes(data.notes ?? "");
      setLoading(false);
    });
  }, [id]);

  const handleScrape = async () => {
    if (!websiteUrl) return;
    setScraping(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.name && !name) setName(data.name);
      if (data.logo_url) setLogoUrl(data.logo_url);
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.colors?.[1]) setSecondaryColor(data.colors[1]);
    } catch (e: any) {
      setError("Scrape failed: " + e.message);
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Brand name is required"); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("brands").update({
      name:            name.trim(),
      website_url:     websiteUrl || null,
      logo_url:        logoUrl || null,
      primary_color:   primaryColor,
      secondary_color: secondaryColor,
      industry:        industry || null,
      tone,
      target_audience: audience || null,
      content_pillars: pillars.filter(Boolean),
      products:        products.filter(Boolean),
      product_images:  productImages,
      notes:           notes || null,
      updated_at:      new Date().toISOString(),
    }).eq("id", id);
    if (error) { setError(error.message); setSaving(false); return; }
    router.push("/brands");
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await supabase.from("brands").delete().eq("id", id);
    router.push("/brands");
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading brand…
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Brand</h1>
          <p className="text-slate-500 mt-1">Update your brand kit</p>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Brand
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* URL Scraper */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-violet-800 mb-1">🪄 Re-scan website</p>
          <p className="text-xs text-violet-600 mb-3">Re-scan the website to refresh logo and colours</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-violet-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <button type="button" onClick={handleScrape} disabled={scraping || !websiteUrl}
              className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {scraping ? "Scanning…" : "Scan"}
            </button>
          </div>
        </div>

        {/* Brand Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Brand Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Acme Corp"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Logo URL</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.png"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          {logoUrl && <img src={logoUrl} alt="preview" className="mt-2 h-12 object-contain border rounded-lg p-1" />}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Primary Colour</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
              <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Secondary Colour</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
              <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
        </div>

        {/* Industry + Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Brand Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value as Tone)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              {TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Target Audience</label>
          <input value={audience} onChange={e => setAudience(e.target.value)}
            placeholder="e.g. Construction site managers aged 35–55 in South Africa"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        {/* Content Pillars */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Content Pillars <span className="text-slate-400 font-normal normal-case">(up to 5 themes)</span>
          </label>
          <div className="space-y-2">
            {pillars.map((p, i) => (
              <input key={i} value={p} onChange={e => { const n = [...pillars]; n[i] = e.target.value; setPillars(n); }}
                placeholder={`Pillar ${i + 1} — e.g. Safety tips`}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            ))}
            {pillars.length < 5 && (
              <button type="button" onClick={() => setPillars([...pillars, ""])}
                className="text-xs text-violet-600 font-semibold hover:underline">+ Add pillar</button>
            )}
          </div>
        </div>

        {/* Products / Equipment */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Products / Equipment <span className="text-slate-400 font-normal normal-case">(used for image variety)</span>
          </label>
          <div className="space-y-2">
            {products.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input value={p} onChange={e => { const n = [...products]; n[i] = e.target.value; setProducts(n); }}
                  placeholder="e.g. Wheel Loader"
                  className="w-1/3 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <input value={productImages[p] ?? ""} onChange={e => {
                  if (p) setProductImages(prev => ({ ...prev, [p]: e.target.value }));
                }}
                  placeholder="Reference photo URL (optional)"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            ))}
            {products.length < 10 && (
              <button type="button" onClick={() => setProducts([...products, ""])}
                className="text-xs text-violet-600 font-semibold hover:underline">+ Add product</button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Paste a direct photo URL — Ideogram will remix your actual machine into new scenes</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Additional Notes <span className="text-slate-400 font-normal normal-case">(style guide, key messages, things to avoid)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="e.g. Never mention competitor names. Always end Instagram posts with a question."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
