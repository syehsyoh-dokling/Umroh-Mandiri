"use client";

import {
  ArrowRight,
  Bus,
  Calculator,
  CreditCard,
  FileText,
  Hotel,
  Languages,
  MapPin,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  UtensilsCrossed,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/site/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getFeatureRoute } from "@/lib/feature-routes";
import { useStoredAuthUser } from "@/lib/use-stored-auth-user";

type AuthUser = {
  nama?: string;
  email?: string;
};

type LoginPromptState = {
  open: boolean;
  target?: string;
  label?: string;
  pageCode?: string;
};

type GeoResult = {
  ip: string;
  location: string;
  country: string;
};

const heroMenus = [
  { label: "Kalkulator Umroh", target: "kalkulator-umroh", icon: Calculator },
  { label: "Promo Tiket & Paket Murah", target: "promo", icon: CreditCard },
  { label: "Tips Umroh Mandiri", target: "panduan", icon: MapPin },
];

const recommendationItems = [
  {
    key: "tiket",
    title: "Tiket Termurah 2 bulan kedepan",
    sub: "Rute dan jadwal hemat",
    icon: Ticket,
  },
  {
    key: "hotel-nusuk",
    title: "Hotel Nyaman & NUSUK",
    sub: "Hotel dan akses layanan",
    icon: Hotel,
  },
  {
    key: "hotel",
    title: "Hotel Dekat Masjid",
    sub: "Prioritas area Haramain",
    icon: MapPin,
  },
  {
    key: "visa",
    title: "Urus Visa Mandiri",
    sub: "Panduan proses mandiri",
    icon: ShieldCheck,
  },
];

const supportMenus = [
  { label: "Pemandu Arah", target: "arah", icon: MapPin },
  { label: "Taxi / Bus", target: "transportasi", icon: Bus },
  { label: "Belanja / Wisata", target: "belanja", icon: ShoppingBag },
  { label: "Catering Indonesia", target: "catering", icon: UtensilsCrossed },
  { label: "Laundry", target: "loundry", icon: WashingMachine },
  { label: "Penerjemah Digital", target: "bicara", icon: Languages },
  { label: "Air Zamzam / Handling", target: "handling", icon: ShieldCheck },
  { label: "Vieo Talkin Doa", target: "panduan", icon: FileText },
  { label: "Bimbingan Online", target: "bimbingan", icon: CreditCard },
];

function normalizeReferral(code?: string | null) {
  const c = String(code ?? "").trim();
  return c ? c.slice(0, 50) : "0000";
}

function createPageCode(target: string) {
  return `${target}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withFeatureParams(destination: string, target: string, pageCode: string) {
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}feature=${encodeURIComponent(target)}&page_code=${encodeURIComponent(pageCode)}`;
}

async function getIPandLocation(): Promise<GeoResult> {
  const providers = [
    {
      url: "https://ipapi.co/json/",
      map: (d: Record<string, unknown>) => ({
        ip: String(d.ip || ""),
        location: [d.city, d.region].filter(Boolean).join(", "),
        country: String(d.country_name || ""),
      }),
    },
    {
      url: "https://ipinfo.io/json",
      map: (d: Record<string, unknown>) => ({
        ip: String(d.ip || ""),
        location: [d.city, d.region].filter(Boolean).join(", "),
        country: String(d.country || ""),
      }),
    },
  ];

  for (const provider of providers) {
    try {
      const r = await fetch(provider.url, { cache: "no-store" });
      if (!r.ok) continue;
      const d = (await r.json()) as Record<string, unknown>;
      const mapped = provider.map(d);
      if (mapped.ip || mapped.location || mapped.country) {
        return mapped;
      }
    } catch {
      continue;
    }
  }

  const ipMetaRaw = localStorage.getItem("ip_meta");
  if (ipMetaRaw) {
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

  return { ip: "", location: "", country: "" };
}

export default function BerandaPage() {
  const router = useRouter();
  const user = useStoredAuthUser<AuthUser>();
  const [loginPrompt, setLoginPrompt] = useState<LoginPromptState>({ open: false });
  const [activeHeroMenu, setActiveHeroMenu] = useState<string>(heroMenus[0]?.label ?? "");

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    const requestedAction = new URL(window.location.href).searchParams.get("action");
    if (accessToken && requestedAction === "login") {
      router.replace("/menu");
      return;
    }

    const url = new URL(window.location.href);
    const pathnameMatch = window.location.pathname.match(/referal(\w+)/i);
    const ref = normalizeReferral(
      url.searchParams.get("ref") ||
        url.searchParams.get("reff") ||
        pathnameMatch?.[1] ||
        localStorage.getItem("referral")
    );

    localStorage.setItem("referral", ref);

    void getIPandLocation().then((geo) => {
      localStorage.setItem(
        "ip_meta",
        JSON.stringify({
          ip: geo.ip,
          city: geo.location,
          country: geo.country,
          source_page: "/beranda",
        })
      );
    });
  }, [router]);

  const visitorName = useMemo(() => {
    const rawName = user?.nama?.trim();
    if (rawName) return rawName;
    return "Saifuddin ST";
  }, [user?.nama]);

  const promptLogin = (target?: string, label?: string) => {
    const pageCode = target ? createPageCode(target) : createPageCode("login");
    if (label) setActiveHeroMenu(label);

    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      if (!target) {
        router.push("/menu");
        return;
      }

      const destination = getFeatureRoute(target, "/menu");
      localStorage.setItem("selected_feature_label", label || target);
      localStorage.setItem("selected_page_code", pageCode);
      router.push(withFeatureParams(destination, target, pageCode));
      return;
    }

    setLoginPrompt({ open: true, target, label, pageCode });
  };

  const confirmLogin = () => {
    const destination = getFeatureRoute(loginPrompt.target, "/menu");
    if (loginPrompt.target) {
      localStorage.setItem("selected_feature_label", loginPrompt.label || loginPrompt.target);
      localStorage.setItem("selected_page_code", loginPrompt.pageCode || "");
      localStorage.setItem(
        "redirect_after_login",
        withFeatureParams(destination, loginPrompt.target, loginPrompt.pageCode || "")
      );
    } else {
      localStorage.setItem("redirect_after_login", "/menu");
    }
    setLoginPrompt({ open: false });
    router.push("/login");
  };

  const declineLogin = () => {
    setLoginPrompt({ open: false });
    router.push("/");
  };

  return (
    <main className="post-auth-shell">
      <section className="post-auth-hero">
        <div className="post-auth-hero-fade" aria-hidden />

        <div className="post-auth-hero-inner">
          <div className="post-auth-topbar">
            <div className="flex justify-start">
              <Link href="/">
                <Button variant="ghost" className="h-10 border-white/30 bg-white/12 px-4 text-white hover:bg-white/20">
                  Kembali
                </Button>
              </Link>
            </div>

            <div className="flex justify-center" />

            <div className="hidden justify-end sm:flex">
              <Button variant="secondary" className="h-10 px-5" onClick={() => promptLogin()}>
                Login
              </Button>
            </div>
          </div>

          <div className="post-auth-brand">
            <div className="post-auth-brand-mark">
              <BrandMark className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
            <h1 className="post-auth-brand-title">
              MUWAHID
            </h1>
            <p className="post-auth-brand-tagline">
              Asisten virtual yang siap membantu dan menjadikan umroh Anda semudah pulang kampung
            </p>
          </div>

          <div className="post-auth-intro">
            <p className="post-auth-intro-title">
              Bapak/Ibu {visitorName}, Semoga Ibadah Umroh Anda
            </p>
            <p className="post-auth-intro-subtitle">Mabrur dan diterima di sisi Allah SWT.</p>

            <div className="mt-3 flex flex-wrap gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="h-12 rounded-full px-6 text-sm shadow-[0_18px_32px_rgba(184,117,8,0.28)]"
                onClick={() => promptLogin("persiapan", "Mulai Perjalanan Umroh")}
              >
                Mulai Perjalanan Umroh
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="post-auth-surface">
        <Card className="post-auth-card p-3">
          <div className="px-2 pb-4 pt-1 text-center">
            <p className="dashboard-chip-label">Dashboard / Beranda</p>
            <p className="dashboard-chip-copy">
              Semua kebutuhan umroh (mandiri atau melalui travel) kini dalam satu genggaman, dari persiapan, keberangkatan, jemputan bandara, panduan selama di Mekah & Madinah termasuk petunjuk membeli oleh-oleh, air zamzam dan kepulangan.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {heroMenus.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeHeroMenu === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => promptLogin(item.target, item.label)}
                  className={`hero-menu-button hero-menu-tone-${index} ${
                    isActive
                      ? "hero-menu-button-active"
                      : "hover:brightness-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 pt-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="h-full rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-5 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
              <Plane className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Perjalanan Umroh</p>
              <CardTitle className="mt-1 font-[family-name:var(--font-display)] text-[2rem]">
                Umroh Mandiri
              </CardTitle>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[rgba(193,166,113,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,244,226,0.92))] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Akan ada orang berangkat dalam waktu dekat:
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] bg-white/86 px-4 py-3">
                <p className="font-semibold text-[var(--foreground)]">12 Mei - Jakarta - Jeddah</p>
                <p className="mt-1 text-sm text-[var(--muted)]">5 orang • rombongan mandiri</p>
              </div>
              <div className="rounded-[16px] bg-white/86 px-4 py-3">
                <p className="font-semibold text-[var(--foreground)]">18 Mei - Medan - Madinah</p>
                <p className="mt-1 text-sm text-[var(--muted)]">3 orang • open jamaah</p>
              </div>
            </div>

            <Button
              variant="secondary"
              className="mt-4 h-11 w-full justify-between rounded-full"
              onClick={() => promptLogin("persiapan", "Gabung perjalanan mereka sekarang")}
            >
              Gabung perjalanan mereka sekarang
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
        <Card className="h-full rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-5 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Perjalanan Umroh</p>
              <CardTitle className="mt-1 font-[family-name:var(--font-display)] text-[2rem]">
                Umroh Via Travel
              </CardTitle>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[16px] border border-[rgba(193,166,113,0.16)] bg-white/86 px-4 py-3 text-sm">
              <span className="font-medium text-[var(--foreground)]">Paket Termurah</span>
              <span className="text-[var(--muted)]">Mulai Rp 26,9 jt</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] border border-[rgba(193,166,113,0.16)] bg-white/86 px-4 py-3 text-sm">
              <span className="font-medium text-[var(--foreground)]">Paket Terlama/tersingkat</span>
              <span className="text-[var(--muted)]">9 hari • 14 hari</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] border border-[rgba(193,166,113,0.16)] bg-white/86 px-4 py-3 text-sm">
              <span className="font-medium text-[var(--foreground)]">Paket Umroh + Wisata</span>
              <span className="text-[var(--muted)]">Turki • Dubai • Thaif</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => promptLogin("promo", "Umroh via Travel")}
            className="post-auth-primary-cta mt-4"
          >
            Lihat Semua Paket
            <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      </section>

      <section className="grid gap-4 pt-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-0 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <div className="relative min-h-[220px] p-5">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/assets/hero-makkah-kaabah.jpg')" }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,76,80,0.16),rgba(116,69,10,0.76))]" aria-hidden />
            <div className="relative z-10 flex h-full flex-col justify-between text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">Promo Menarik</p>
                <h3 className="mt-3 max-w-[240px] font-[family-name:var(--font-display)] text-[2rem] leading-tight">
                  Promo Cicilan Umroh
                </h3>
              </div>
              <Button
                variant="secondary"
                className="post-auth-photo-cta mt-6"
                onClick={() => promptLogin("promo", "Promo Cicilan Umroh")}
              >
                Lihat penawaran
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-0 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <div className="relative min-h-[220px] p-5">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/assets/hero-makkah-kaabah.jpg')" }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,76,80,0.16),rgba(116,69,10,0.76))]" aria-hidden />
                <div className="relative z-10 flex h-full flex-col justify-between text-white">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">Spesial Ramadhan</p>
                    <h3 className="mt-3 max-w-[260px] font-[family-name:var(--font-display)] text-[1.65rem] leading-tight">
                      Umroh + Full Iktikaf
                      <br />
                      10 Hari Terakhir Ramadhan
                    </h3>
                  </div>
                  <Button
                    variant="secondary"
                    className="post-auth-photo-cta mt-6"
                    onClick={() => promptLogin("umroh-ramadhan", "Spesial Ramadhan Umroh + full Iktikaf 10 hari terakhir")}
                  >
                    Lihat Testimoni Jamaah
                    <ArrowRight className="h-4 w-4" />
                  </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 pt-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="h-full rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-5 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Kebutuhan Wajib Umroh Mandiri</p>
          <CardTitle className="mt-2 font-[family-name:var(--font-display)] text-[1.9rem]">
            Siapkan fondasi sebelum berangkat
          </CardTitle>
          <div className="mt-4 space-y-2.5">
            {[
              { label: "Pasport", target: "visa" },
              { label: "Cari Tiket", target: "tiket" },
              { label: "Cari Hotel", target: "hotel" },
              { label: "Antar Jemput Bandara (di Arab)", target: "antarjemput" },
              { label: "Kontak Muthawif", target: "muthawif" },
            ].map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => promptLogin(item.target, item.label)}
                className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] ${
                  index === 0
                    ? "bg-[linear-gradient(90deg,#2a6f67,#1e5e57)] text-white"
                    : "border border-[rgba(193,166,113,0.14)] bg-white/86 text-[var(--foreground)]"
                }`}
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="h-full rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-5 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
              <MapPin className="h-5 w-5" />
            </span>
            <CardTitle className="font-[family-name:var(--font-display)] text-[1.9rem]">
              Rekomendasi Untuk Anda
            </CardTitle>
          </div>

          <div className="mt-4 space-y-2.5">
            {recommendationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => promptLogin(item.key, item.title)}
                  className="flex w-full items-center justify-between rounded-[16px] border border-[rgba(193,166,113,0.14)] bg-white/86 px-4 py-3 text-left transition hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(214,177,110,0.14)] text-[var(--primary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="pt-4">
        <Card className="rounded-[24px] border border-white/70 bg-[rgba(255,249,239,0.94)] p-5 shadow-[0_18px_34px_rgba(112,88,39,0.12)]">
          <CardTitle className="mx-auto max-w-5xl text-center font-[family-name:var(--font-display)] text-[1.15rem] leading-[1.8] sm:text-[1.35rem]">
            MUWAHID juga menyediakan berbagai fitur pendukung untuk Anda, ekplore berbagai menu dan fitur dibawah ini untuk memudahkan dan melancarkan ibadah umroh Anda. Semoga perjalanan Anda aman, lancar dan menjadi Umroh yang Mabrur
          </CardTitle>

          <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-3">
            {supportMenus.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => promptLogin(item.target, item.label)}
                  className="flex items-center justify-between rounded-[16px] bg-[linear-gradient(90deg,rgba(214,236,236,0.85),rgba(255,224,172,0.88))] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition hover:brightness-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/58 text-[var(--primary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[15px] font-semibold text-[var(--foreground)] sm:text-base">{item.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--foreground)]/70" />
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <footer className="pb-2 pt-5 text-center text-xs leading-6 text-[var(--muted)]">
        Muwahid Copyright 2025
        <br />
        Dipersembahkan oleh Bani Saifuddin Indonesia
      </footer>

      <div className="fixed right-4 top-[78vh] z-40 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
        {[
          { label: "Cari Tiket", target: "tiket", tone: "from-[#f0b43f] to-[#c67a07]" },
          { label: "Urus Visa", target: "visa", tone: "from-[#2e9f92] to-[#176d64]" },
          { label: "Gabung Jamaah", target: "persiapan", tone: "from-[#47756f] to-[#214e4b]" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => promptLogin(item.target, item.label)}
            className={`rounded-[18px] bg-gradient-to-b ${item.tone} px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_rgba(35,31,23,0.22)]`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loginPrompt.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(48,33,11,0.38)] px-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(252,245,235,0.94))] p-7 shadow-[0_24px_42px_rgba(74,50,14,0.18)]">
            <CardTitle className="font-[family-name:var(--font-display)] text-3xl">
              Calon Tamu Allah yang terhormat
            </CardTitle>
            <CardDescription className="mt-4 text-base leading-8 text-[var(--muted-strong)]">
              Kami mengharuskan Anda untuk Login terlebih dahulu sebelum melihat menu tersebut, agar sistem data menjadi lebih vald. Apakah Anda bersedia Login?
            </CardDescription>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={confirmLogin}>
                Ya
              </Button>
              <Button variant="ghost" className="flex-1" onClick={declineLogin}>
                Tidak
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
