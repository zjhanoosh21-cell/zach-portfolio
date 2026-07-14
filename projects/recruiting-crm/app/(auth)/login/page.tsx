"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard?window=1d");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">

        {/* Left panel — branding */}
        <div
          className="hidden md:flex flex-col items-center justify-center w-2/5 px-10 py-16 text-white"
          style={{ background: "linear-gradient(160deg, #0f2a4a 0%, #1a6bbf 100%)" }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 h-1.5 w-2/5" style={{ background: "linear-gradient(90deg, #1a6bbf, #4ea8de)" }} />

          <Image
            src="/logo.jpg"
            alt="Corporate Recruiters Inc."
            width={180}
            height={180}
            className="object-contain rounded mb-8"
            priority
          />

          <h2 className="text-xl font-bold tracking-tight text-center leading-snug">
            Corporate Recruiters Inc.
          </h2>
          <p className="text-sm text-blue-200 mt-2 text-center tracking-wide uppercase">
            Recruiting CRM
          </p>

          <div className="mt-10 w-full border-t border-white/10 pt-8 space-y-4">
            {[
              { label: "AI-Powered Scoring", desc: "Instant candidate analysis" },
              { label: "Full Pipeline View", desc: "From intake to placement" },
              { label: "Client Management", desc: "Job orders & submissions" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-400/30 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-blue-300">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex flex-col justify-center px-10 py-14">
          {/* Top accent bar (mobile only — hidden when left panel shows) */}
          <div className="md:hidden h-1.5 w-full absolute top-0 left-0" style={{ background: "linear-gradient(90deg, #1a6bbf, #4ea8de, #1a6bbf)" }} />

          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <Image src="/logo.jpg" alt="Corporate Recruiters Inc." width={100} height={100} className="object-contain" priority />
            <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mt-2">Recruiting CRM</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <div className="mb-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Portfolio demo — come on in</p>
            <p className="mt-1">
              Sign in with <span className="font-mono font-semibold">demo@example.com</span> /{" "}
              <span className="font-mono font-semibold">DemoPass123!</span>. All candidates,
              clients, and jobs inside are fictional demo data. Admin PIN (for exports and
              deletes): <span className="font-mono font-semibold">1234</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="demo@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full h-11 rounded border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 rounded border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded bg-red-50 border border-red-200 px-4 py-3">
                <span className="text-red-500 text-sm leading-none shrink-0">✕</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              style={{ background: loading ? "#64748b" : "linear-gradient(135deg, #1a6bbf, #2563eb)" }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            {showForgot ? (
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                To reset your password, contact your System Administrator. They can reset it for you from the Settings page.
                <button
                  onClick={() => setShowForgot(false)}
                  className="block mx-auto mt-2 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowForgot(true)}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
