"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronUp, Gift } from "lucide-react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/site/brand-mark";
import { MuwahidAssistant } from "@/components/site/muwahid-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/config";
import { defaultLandingContent, type LandingContent } from "@/lib/landing-content";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      delay,
    },
  }),
};

export default function Home() {
  const router = useRouter();
  const [showPromo, setShowPromo] = useState(false);
  const [content, setContent] = useState<LandingContent>(defaultLandingContent);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetch(apiUrl("/content/landing"))
      .then((res) => (res.ok ? res.json() : defaultLandingContent))
      .then((payload: LandingContent) => setContent(payload))
      .catch(() => setContent(defaultLandingContent));
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const pathnameMatch = window.location.pathname.match(/referal(\w+)/i);
      const reff =
        url.searchParams.get("reff") ||
        url.searchParams.get("ref") ||
        url.searchParams.get("referal") ||
        url.searchParams.get("referral") ||
        pathnameMatch?.[1];

      if (reff) {
        localStorage.setItem("referral", String(reff).trim().slice(0, 100));
      } else if (!localStorage.getItem("referral")) {
        localStorage.setItem("referral", "0000");
      }

      const visitPayload = {
        user_agent: navigator.userAgent || "",
        language: navigator.language || "",
        platform: navigator.platform || "",
        screen: `${window.screen.width}x${window.screen.height}`,
        visited_at: new Date().toISOString(),
        landing_path: window.location.pathname,
        landing_url: window.location.href,
      };

      localStorage.setItem("landing_meta", JSON.stringify(visitPayload));

      fetch("https://ipinfo.io/json")
        .then((r) => r.json())
        .then((d) => {
          localStorage.setItem(
            "ip_meta",
            JSON.stringify({
              ip: d.ip || "",
              city: d.city || "",
              region: d.region || "",
              country: d.country || "",
              loc: d.loc || "",
              org: d.org || "",
              timezone: d.timezone || "",
            })
          );
        })
        .catch(() => undefined);

      const closed = localStorage.getItem("promo_closed");
      if (!closed) {
        const timer = window.setTimeout(() => setShowPromo(true), 1400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      return undefined;
    }
  }, []);

  const goLogin = (redirectTo: string, featureLabel?: string) => {
    localStorage.setItem("redirect_after_login", redirectTo);
    if (featureLabel) localStorage.setItem("selected_feature_label", featureLabel);
    router.push("/login");
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const closePromo = () => {
    setShowPromo(false);
    localStorage.setItem("promo_closed", "1");
  };

  return (
    <main className="mx-auto w-full max-w-[1320px] px-3 pb-8 pt-3 sm:px-4 sm:pb-10 lg:px-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/45 shadow-[var(--shadow-strong)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/hero-makkah-kaabah.jpg')" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(86,56,18,0.22)_0%,rgba(62,44,16,0.08)_22%,rgba(248,240,225,0.62)_68%,rgba(248,240,225,0.98)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,247,228,0.22),transparent_28%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.46),transparent_28%)]"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[420px] flex-col items-center px-5 pb-24 pt-8 text-center sm:min-h-[520px] sm:px-8 sm:pb-28 sm:pt-10">
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0.04}>
            <div className="mx-auto inline-flex rounded-[18px] border border-[rgba(116,79,28,0.24)] bg-[rgba(255,247,229,0.68)] p-2 shadow-[0_14px_30px_rgba(80,50,10,0.14)] backdrop-blur-sm">
              <BrandMark className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0.08} className="mt-4 max-w-3xl">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[#f7eddb] drop-shadow-[0_6px_20px_rgba(56,30,5,0.34)] sm:text-[2.1rem]">
              {content.hero.welcome}
            </p>
            <h1 className="mt-1 font-[family-name:Arial,Helvetica,sans-serif] text-5xl font-black tracking-[0.06em] text-white drop-shadow-[0_8px_24px_rgba(60,37,8,0.35)] sm:text-[4.3rem]">
              {content.hero.brand}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl rounded-full bg-[rgba(10,35,31,0.34)] px-5 py-2 text-sm font-bold leading-6 text-[#fff4de] shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-[3px] drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)] sm:text-base sm:leading-7">
              {content.hero.description}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0.12}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              size="sm"
              variant="secondary"
              className="h-11 rounded-full px-5 text-sm font-bold shadow-[0_10px_24px_rgba(164,110,24,0.28)] sm:h-12 sm:px-6"
              onClick={() => goLogin("/menu", "Landing CTA")}
            >
              Mulai Sekarang
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-11 rounded-full border-white/18 bg-[rgba(79,83,86,0.44)] px-5 text-sm font-semibold text-white backdrop-blur-md hover:bg-[rgba(79,83,86,0.54)] sm:h-12 sm:px-6"
              onClick={() => router.push("/beranda.html")}
            >
              Jelajahi Fitur
              <ChevronDown className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="-mt-20 rounded-[26px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(255,251,243,0.76),rgba(250,244,233,0.72))] p-4 shadow-[0_24px_42px_rgba(108,82,39,0.1)] backdrop-blur-[6px] sm:-mt-24 sm:p-6">
        <div className="rounded-[22px] border border-[rgba(196,170,126,0.12)] bg-[rgba(255,252,246,0.7)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--secondary-strong)]">
            {content.featureSection.eyebrow}
          </p>
          <h2 className="mt-2 max-w-[760px] font-[family-name:var(--font-display)] text-[1.15rem] leading-[1.55] text-[var(--foreground)] sm:text-[1.5rem]">
            {content.featureSection.title}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--muted-strong)] sm:text-[15px]">
            {content.featureSection.description}
          </p>

          <div className="mt-5 rounded-[20px] border border-[rgba(195,153,77,0.18)] bg-[linear-gradient(180deg,rgba(227,197,141,0.18),rgba(223,160,58,0.28))] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[560px] text-sm leading-7 text-[var(--foreground)] sm:text-base">
                {content.featureSection.joinLabel}
              </p>
              <Button
                variant="secondary"
                className="min-w-[170px] rounded-full px-5"
                onClick={() => router.push("/daftar-jamaah")}
              >
                Lihat Daftar Jamaah
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {content.features.map((item) => {
            const isExpanded = expanded[item.key];
            return (
              <Card
                key={item.key}
                className="rounded-[22px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(249,243,232,0.96))] p-4 shadow-[0_14px_26px_rgba(115,88,42,0.08)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  {item.sub}
                </p>
                <CardTitle className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] leading-tight sm:text-[1.72rem]">
                  {item.title}
                </CardTitle>
                <CardDescription className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                  {item.summary}
                </CardDescription>

                {isExpanded ? (
                  <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted-strong)]">
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.key)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--secondary-strong)]"
                  >
                    {isExpanded ? (
                      <>
                        Sembunyikan detail
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Read more
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full px-5"
                    onClick={() => goLogin(`/menu?feature=${item.key}`, item.title)}
                  >
                    {item.ctaLabel}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="pt-4">
        <Card className="rounded-[24px] border border-[rgba(196,170,126,0.2)] bg-[linear-gradient(180deg,rgba(255,251,243,0.98),rgba(249,243,232,0.96))] p-5 shadow-[0_18px_30px_rgba(115,88,42,0.08)] sm:p-6">
          <CardTitle className="font-[family-name:var(--font-display)] text-[1.95rem] leading-tight sm:text-[2.3rem]">
            {content.why.title}
          </CardTitle>
          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted-strong)] sm:text-[15px]">
            {content.why.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Card>
      </section>

      <section className="pt-4">
        <Card className="relative overflow-hidden rounded-[24px] border border-[rgba(196,170,126,0.2)] bg-[linear-gradient(180deg,rgba(245,217,164,0.5),rgba(227,189,124,0.38))] p-6 text-center shadow-[0_18px_30px_rgba(115,88,42,0.08)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,245,0.32),rgba(230,195,132,0.12)),url('/assets/hero-makkah-kaabah.jpg')] bg-cover bg-center opacity-[0.12]" />
          <div className="relative z-10">
            <CardTitle className="font-[family-name:var(--font-display)] text-[2rem] leading-tight text-[var(--foreground)] sm:text-[2.6rem]">
              Siap Memulai Perjalanan Suci Anda?
            </CardTitle>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-strong)] sm:text-base">
              Mulailah dari perencanaan yang lebih cerdas, lebih praktis, dan lebih sesuai kebutuhan Anda.
            </p>
            <Button
              variant="secondary"
              className="mx-auto mt-5 min-w-[220px] rounded-full px-6"
              onClick={() => goLogin("/menu", "CTA Bawah")}
            >
              Bismillah, Mulai Sekarang
            </Button>
          </div>
        </Card>
      </section>

      <footer className="mt-4 rounded-[24px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(146,110,57,0.92),rgba(126,92,44,0.96))] px-4 py-5 text-[#fff6e7] shadow-[0_18px_30px_rgba(93,67,28,0.14)] sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10 rounded-[12px]" />
              <div>
                <p className="font-semibold tracking-[0.14em]">MUWAHID</p>
                <p className="text-xs text-[#f3e3c6]">Asisten Umroh Digital</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-6 text-[#f8e9cf]">
              Asisten Umroh Digital untuk Jamaah Indonesia.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Navigasi</p>
            <div className="mt-3 space-y-2 text-xs text-[#f8e9cf]">
              <p>Tentang MUWAHID</p>
              <p>Fitur Umroh</p>
              <p>Kalkulator Umroh</p>
              <p>Visa & Administrasi</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Bantuan</p>
            <div className="mt-3 space-y-2 text-xs text-[#f8e9cf]">
              <p>Pusat Bantuan</p>
              <p>Kontak Kami</p>
              <p>Kebijakan Privasi</p>
              <p>Syarat & Ketentuan</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Mulai Sekarang</p>
            <p className="mt-3 text-xs leading-6 text-[#f8e9cf]">
              Temukan solusi umroh yang lebih mudah dan terarah.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-4 rounded-full px-5"
              onClick={() => goLogin("/menu", "Footer CTA")}
            >
              Masuk ke MUWAHID
            </Button>
          </div>
        </div>
      </footer>

      {showPromo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(52,34,10,0.4)] px-4 backdrop-blur-sm">
          <Card className="relative w-full max-w-xl rounded-[28px] border-t-4 border-t-[var(--secondary)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(250,244,233,0.96))] p-7">
            <button
              type="button"
              onClick={closePromo}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(0,0,0,0.05)] text-xl text-[var(--muted)]"
            >
              ×
            </button>
            <div className="mb-4 inline-flex rounded-full bg-[rgba(223,160,58,0.18)] p-3 text-[var(--secondary-strong)]">
              <Gift className="h-6 w-6" />
            </div>
            <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
              {content.promo.title}
            </CardTitle>
            <CardDescription className="mt-4 text-lg leading-8">
              {content.promo.description}
            </CardDescription>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" variant="ghost" onClick={closePromo}>
                {content.promo.secondaryLabel}
              </Button>
              <Button className="flex-1" onClick={() => goLogin("/menu?feature=promo", "Promo Popup")}>
                {content.promo.primaryLabel}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <MuwahidAssistant />
    </main>
  );
}
