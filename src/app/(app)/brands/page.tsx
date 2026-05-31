import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Globe, Pencil } from "lucide-react";

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, industry, tone, primary_color, logo_url, website_url")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
          <p className="text-slate-500 mt-1">{brands?.length ?? 0} brand{(brands?.length ?? 0) !== 1 ? "s" : ""} configured</p>
        </div>
        <Link
          href="/brands/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Brand
        </Link>
      </div>

      {!brands?.length ? (
        <div className="text-center py-16 text-slate-400">
          <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No brands yet</p>
          <p className="text-sm mt-1">Add your first brand to start generating content</p>
          <Link href="/brands/new" className="inline-block mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-500 transition-colors">
            Add Brand
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: brand.primary_color ?? "#8b5cf6" }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 rounded-lg object-contain border border-slate-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
                        style={{ backgroundColor: brand.primary_color ?? "#8b5cf6" }}>
                        {brand.name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{brand.name}</p>
                      {brand.industry && <p className="text-xs text-slate-500">{brand.industry}</p>}
                    </div>
                  </div>
                  <Link href={`/brands/${brand.id}`} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {brand.tone && (
                    <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium capitalize">{brand.tone}</span>
                  )}
                  {brand.website_url && (
                    <a href={brand.website_url} target="_blank" rel="noreferrer"
                      className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium flex items-center gap-1 hover:bg-slate-200 transition-colors">
                      <Globe className="h-2.5 w-2.5" /> Website
                    </a>
                  )}
                </div>

                <Link
                  href={`/generate?brandId=${brand.id}`}
                  className="mt-4 block text-center py-2 border border-violet-200 text-violet-600 rounded-lg text-xs font-semibold hover:bg-violet-50 transition-colors"
                >
                  Generate Content →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Palette({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  );
}
