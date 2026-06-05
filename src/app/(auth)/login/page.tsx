"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-1 mb-2">
            <div className="inline-flex items-center gap-2.5">
              {/* BrandFlow swirl mark */}
              <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                <defs>
                  <linearGradient id="ls1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#a855f7"/></linearGradient>
                  <linearGradient id="ls2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
                  <linearGradient id="ls3" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#eab308"/><stop offset="100%" stopColor="#f97316"/></linearGradient>
                </defs>
                <path d="M32 6 C50 6 58 18 58 32 C58 46 50 58 32 58" stroke="url(#ls1)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <path d="M32 58 C14 58 6 46 6 32 C6 18 14 6 32 6" stroke="url(#ls2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <path d="M32 14 C44 14 50 22 50 32 C50 42 44 50 32 50 C20 50 14 42 14 32" stroke="url(#ls3)" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <path d="M20 50 L14 60 L28 54" stroke="url(#ls2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M32 20 L33.8 26.2 L40.2 26.2 L35.2 30.1 L37 36.3 L32 32.4 L27 36.3 L28.8 30.1 L23.8 26.2 L30.2 26.2 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
              </svg>
              <span className="font-black text-2xl tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">Brand</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-orange-300">flow</span>
              </span>
            </div>
            {/* DRYVN credit */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase">by</span>
              <span className="font-black italic text-sm tracking-tight">
                <span className="text-white/70">DRYV</span>
                <span style={{ color: "#60a5fa" }}>N</span>
                <span style={{ color: "#93c5fd", fontSize: "0.7em" }}>↑</span>
              </span>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">AI-powered social content at scale</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
