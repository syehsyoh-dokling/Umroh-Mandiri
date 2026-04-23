"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/site/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/config";

type GeoResult = {
  ip: string;
  location: string;
  country: string;
};

function getCachedGeo(): GeoResult {
  const ipMetaRaw = localStorage.getItem("ip_meta");
  if (!ipMetaRaw) {
    return { ip: "", location: "", country: "" };
  }

  try {
    const d = JSON.parse(ipMetaRaw);
    return {
      ip: d.ip || "",
      location: [d.city, d.region].filter(Boolean).join(", "),
      country: d.country || "",
    };
  } catch {
    return { ip: "", location: "", country: "" };
  }
}

function normalize(code?: string | null) {
  const c = String(code ?? "").trim();
  return c ? c.slice(0, 50) : "0000";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const pathnameMatch = window.location.pathname.match(/referal(\w+)/i);
    const ref = normalize(
      url.searchParams.get("ref") ||
        url.searchParams.get("reff") ||
        pathnameMatch?.[1] ||
        localStorage.getItem("referral")
    );

    localStorage.setItem("referral", ref);

    const requestedNext = url.searchParams.get("next");
    if (requestedNext) {
      localStorage.setItem("redirect_after_login", requestedNext);
    }

    const savedEmail = localStorage.getItem("savedEmail") || localStorage.getItem("prefill_login_email") || "";

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const goGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      localStorage.setItem("lastAuth", "google");
      setError("Login dengan Google belum aktif di stack baru. Untuk sementara gunakan email dan password agar tetap masuk ke dashboard lokal.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const geo = getCachedGeo();
      const referral = localStorage.getItem("referral") || "0000";
      const agent = navigator.userAgent;
      const redirectTarget = localStorage.getItem("redirect_after_login") || "/menu";
      const pageCode = localStorage.getItem("selected_page_code") || "";

      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          referral_code: referral,
          ip_address: geo.ip,
          device_location: geo.location,
          user_agent: agent,
          page_code: pageCode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || "Login gagal.");
        return;
      }

      localStorage.setItem("email", email.trim());
      localStorage.setItem("access_token", String(data.access_token || ""));
      if (data.refresh_token) localStorage.setItem("refresh_token", String(data.refresh_token));
      if (data.user) localStorage.setItem("auth_user", JSON.stringify(data.user));

      localStorage.setItem(
        "auth_meta",
        JSON.stringify({
          ip: geo.ip,
          location: geo.location,
          country: geo.country,
          agent,
          referral,
          signed_in_at: new Date().toISOString(),
        })
      );

      if (rememberMe) {
        localStorage.setItem("savedEmail", email.trim());
      } else {
        localStorage.removeItem("savedEmail");
      }

      localStorage.setItem("lastAuth", "password");
      if (redirectTarget.includes("/menu") && redirectTarget.includes("feature=")) {
        localStorage.setItem("post_login_prompt_pending", pageCode || "menu");
      } else {
        localStorage.removeItem("post_login_prompt_pending");
      }
      localStorage.removeItem("prefill_login_email");
      router.push(redirectTarget.startsWith("/") ? redirectTarget : "/menu");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal terhubung ke server.";
      setError(message || "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1320px] items-center justify-center overflow-hidden rounded-[34px] border border-white/40 shadow-[var(--shadow-strong)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/hero-makkah-kaabah.jpg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(86,56,18,0.18)_0%,rgba(62,44,16,0.1)_26%,rgba(248,240,225,0.54)_70%,rgba(248,240,225,0.82)_100%)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.34),transparent_25%)]" aria-hidden />

        <Card className="relative z-10 w-full max-w-[520px] rounded-[34px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,252,246,0.76),rgba(253,246,235,0.62))] p-6 shadow-[0_28px_50px_rgba(75,53,19,0.18)] backdrop-blur-md sm:p-8">
          <div className="text-center">
            <BrandMark className="mx-auto h-20 w-20 sm:h-24 sm:w-24" />
            <h1 className="mt-5 font-[family-name:Arial,Helvetica,sans-serif] text-4xl font-black tracking-[0.05em] text-[var(--primary-deep)] sm:text-5xl">
              MUWAHID
            </h1>
            <p className="mt-2 text-xl text-[var(--muted-strong)]">Asisten Umroh Digital</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-[20px] bg-white/82 text-[15px] shadow-[0_8px_20px_rgba(109,87,43,0.08)]"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-[20px] bg-white/82 text-[15px] shadow-[0_8px_20px_rgba(109,87,43,0.08)]"
            />

            <label className="flex items-center gap-3 px-1 text-sm text-[var(--muted-strong)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-[var(--primary)]"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Ingat saya
            </label>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <Button type="submit" variant="secondary" className="h-14 w-full rounded-full text-xl font-semibold" size="lg">
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--line)]" />
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">atau</span>
            <div className="h-px flex-1 bg-[color:var(--line)]" />
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-14 w-full rounded-full bg-white/72 text-lg"
            size="lg"
            onClick={goGoogleLogin}
            disabled={googleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {googleLoading ? "Memproses..." : "Masuk dengan Google"}
          </Button>

          <div className="mt-8 border-t border-[color:var(--line)] pt-5 text-center text-sm text-[var(--muted)]">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-[var(--foreground)]">
              Daftar di sini
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
