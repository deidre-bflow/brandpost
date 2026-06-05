"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2, XCircle, Loader2, Link2, Unlink, AlertTriangle, X, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Brand, SocialConnection, Platform } from "@/lib/types";

// ── Platform meta ─────────────────────────────────────────────────────────────
const PLATFORMS: Array<{
  id: Platform;
  label: string;
  color: string;
  bg: string;
  border: string;
  note: string;
}> = [
  {
    id: "facebook",
    label: "Facebook",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    note: "Posts to your Facebook Page",
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-200",
    note: "Requires a Facebook Page with a linked Instagram Business account",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    note: "Posts as your personal LinkedIn profile",
  },
];

const PLATFORM_ICONS: Record<Platform, string> = {
  facebook:  "𝒇",
  instagram: "📷",
  linkedin:  "in",
};

// ── Facebook page picker modal ─────────────────────────────────────────────────
function PagePickerModal({
  pages,
  onSelect,
  onClose,
  loading,
}: {
  pages: Array<{ id: string; name: string; instagram_business_account?: { id: string; name: string } }>;
  onSelect: (pageId: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Choose a Facebook Page</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select the page to post from. Instagram auto-connects if linked.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => onSelect(page.id)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm flex-shrink-0">
                𝒇
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{page.name}</p>
                {page.instagram_business_account && (
                  <p className="text-xs text-pink-600 mt-0.5">
                    + Instagram: {page.instagram_business_account.name}
                  </p>
                )}
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const supabase     = createClient();

  const [brands, setBrands]           = useState<Brand[]>([]);
  const [selectedBrand, setSelected]  = useState<string>("");
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loadingConn, setLoadingConn] = useState(false);
  const [disconnecting, setDisconn]   = useState<Platform | null>(null);

  // Facebook page picker state
  const [pendingKey, setPendingKey]   = useState<string | null>(null);
  const [fbPages, setFbPages]         = useState<any[]>([]);
  const [connectingPage, setConnPage] = useState(false);

  // Toast / banner state
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Load brands on mount
  useEffect(() => {
    supabase.from("brands").select("id, name, primary_color").order("name").then(({ data }) => {
      if (data?.length) {
        setBrands(data as Brand[]);
        // Pre-select brand from URL or first brand
        const urlBrand = searchParams.get("brandId");
        setSelected(urlBrand && data.find(b => b.id === urlBrand) ? urlBrand : data[0].id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle query-param feedback from OAuth callbacks
  useEffect(() => {
    const err     = searchParams.get("error");
    const success = searchParams.get("success");
    const pending = searchParams.get("pending");

    if (err) {
      const messages: Record<string, string> = {
        facebook_denied: "Facebook connection was cancelled.",
        facebook_csrf:   "Security check failed — please try again.",
        facebook_failed: "Facebook connection failed — check your App ID/Secret.",
        no_pages:        "No Facebook Pages found — create a Page first.",
        linkedin_denied: "LinkedIn connection was cancelled.",
        linkedin_csrf:   "Security check failed — please try again.",
        linkedin_failed: "LinkedIn connection failed — check your Client ID/Secret.",
      };
      setBanner({ type: "error", msg: messages[err] ?? `Connection error: ${err}` });
      router.replace("/connections");
    }

    if (success) {
      const labels: Record<string, string> = {
        linkedin: "LinkedIn connected successfully!",
        facebook: "Facebook (and Instagram) connected!",
      };
      setBanner({ type: "success", msg: labels[success] ?? "Account connected!" });
      router.replace("/connections");
    }

    if (pending) {
      setPendingKey(pending);
      // Fetch pages for selection modal
      fetch(`/api/auth/facebook/pending?key=${pending}`)
        .then(r => r.json())
        .then(d => {
          if (d.pages) setFbPages(d.pages);
          else setBanner({ type: "error", msg: d.error ?? "Could not load pages." });
        });
      router.replace("/connections");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch connections whenever selected brand changes
  const loadConnections = useCallback(async (brandId: string) => {
    if (!brandId) return;
    setLoadingConn(true);
    const res  = await fetch(`/api/connections?brandId=${brandId}`);
    const data = await res.json();
    setConnections(Array.isArray(data) ? data : []);
    setLoadingConn(false);
  }, []);

  useEffect(() => {
    if (selectedBrand) void loadConnections(selectedBrand);
  }, [selectedBrand, loadConnections]);

  const connectionFor = (platform: Platform) =>
    connections.find(c => c.platform === platform) ?? null;

  // OAuth connect — redirects away
  const handleConnect = (platform: Platform) => {
    if (!selectedBrand) return;
    window.location.href = `/api/auth/${platform}?brandId=${selectedBrand}`;
  };

  // Disconnect
  const handleDisconnect = async (platform: Platform) => {
    if (!selectedBrand || !confirm(`Disconnect ${platform}? Scheduled posts to this platform will fail.`)) return;
    setDisconn(platform);
    await fetch(`/api/connections?brandId=${selectedBrand}&platform=${platform}`, { method: "DELETE" });
    setConnections(prev => prev.filter(c => c.platform !== platform));
    setDisconn(null);
  };

  // Facebook page selection
  const handlePageSelect = async (pageId: string) => {
    if (!pendingKey) return;
    setConnPage(true);
    const res  = await fetch("/api/auth/facebook/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: pendingKey, pageId }),
    });
    const data = await res.json();
    setConnPage(false);
    setPendingKey(null);
    setFbPages([]);
    if (data.ok) {
      setBanner({
        type: "success",
        msg: data.instagram
          ? "Facebook + Instagram connected!"
          : "Facebook connected! (No linked Instagram Business Account found.)",
      });
      void loadConnections(selectedBrand);
    } else {
      setBanner({ type: "error", msg: data.error ?? "Connection failed." });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Connected Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect your social accounts so approved posts publish automatically at their scheduled time.
        </p>
      </div>

      {/* Banner */}
      {banner && (
        <div className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-xl mb-5 text-sm font-medium",
          banner.type === "success"
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800",
        )}>
          {banner.type === "success"
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          }
          <span className="flex-1">{banner.msg}</span>
          <button onClick={() => setBanner(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Brand selector */}
      <div className="flex items-center gap-3 mb-8">
        <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Brand:</label>
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={e => setSelected(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-medium text-slate-700"
          >
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Platform cards */}
      {loadingConn ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading connections…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          {PLATFORMS.map(p => {
            const conn        = connectionFor(p.id);
            const isConnected = !!conn;
            const isExpired   = conn?.token_expires_at
              ? new Date(conn.token_expires_at) < new Date()
              : false;

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-2xl border p-5 flex flex-col gap-4 transition-all",
                  isConnected && !isExpired
                    ? "border-green-200 bg-green-50/40"
                    : "border-slate-200 bg-white",
                )}
              >
                {/* Platform icon + name */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 border",
                    p.bg, p.color, p.border,
                  )}>
                    {PLATFORM_ICONS[p.id]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{p.label}</p>
                    <p className="text-[11px] text-slate-400 leading-tight">{p.note}</p>
                  </div>
                </div>

                {/* Status */}
                {isConnected ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
                    isExpired
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-green-100 text-green-700",
                  )}>
                    {isExpired
                      ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      : <CheckCircle2  className="h-3.5 w-3.5 flex-shrink-0" />
                    }
                    <span className="truncate">
                      {isExpired ? "Token expired — reconnect" : conn.account_name ?? "Connected"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 text-slate-400 text-xs font-medium border border-slate-100">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Not connected
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 mt-auto">
                  {!isConnected || isExpired ? (
                    <button
                      onClick={() => handleConnect(p.id)}
                      disabled={!selectedBrand}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                        p.id === "instagram"
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed text-xs"
                          : `${p.bg} ${p.color} hover:opacity-90 border ${p.border}`,
                      )}
                      title={p.id === "instagram" ? "Connect Facebook first — Instagram connects automatically" : undefined}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {p.id === "instagram"
                        ? "Auto-connected via Facebook"
                        : isExpired ? "Reconnect" : "Connect"
                      }
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(p.id)}
                      disabled={disconnecting === p.id}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      {disconnecting === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Unlink className="h-3.5 w-3.5" />
                      }
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 p-4 bg-violet-50 border border-violet-100 rounded-2xl text-sm text-violet-700">
        <p className="font-semibold mb-1">How it works</p>
        <ul className="space-y-1 text-violet-600 text-xs list-disc list-inside">
          <li>Set a post to <strong>Approved</strong> in the Calendar.</li>
          <li>BrandFlow checks every 2 minutes for posts due to publish.</li>
          <li>Published posts update to <strong>Posted</strong> with a link to the live post.</li>
          <li>Failed posts show an error in the calendar — fix and re-approve to retry.</li>
        </ul>
      </div>

      {/* Facebook page picker modal */}
      {pendingKey && fbPages.length > 0 && (
        <PagePickerModal
          pages={fbPages}
          loading={connectingPage}
          onSelect={handlePageSelect}
          onClose={() => { setPendingKey(null); setFbPages([]); }}
        />
      )}
    </div>
  );
}
