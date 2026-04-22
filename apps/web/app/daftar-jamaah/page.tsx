"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/site/brand-mark";
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

const jamaahList = [
  {
    name: "Kelompok Jakarta Premium",
    city: "Jakarta",
    destination: "Jeddah",
    date: "12 Mei 2026",
    members: 5,
    seat: "Masih terbuka 2 kursi",
    focus: "Cocok untuk keluarga kecil yang ingin hotel dekat Masjidil Haram.",
  },
  {
    name: "Rombongan Medan Ramadhan",
    city: "Medan",
    destination: "Madinah",
    date: "18 Mei 2026",
    members: 3,
    seat: "Masih terbuka 1 kursi",
    focus: "Berangkat mandiri dengan fokus ibadah dan itinerary lebih ringan.",
  },
  {
    name: "Komunitas Surabaya I'tikaf",
    city: "Surabaya",
    destination: "Jeddah",
    date: "24 Mei 2026",
    members: 7,
    seat: "Sudah hampir penuh",
    focus: "Cocok untuk jamaah yang ingin bergabung dengan ritme Ramadhan dan i'tikaf.",
  },
  {
    name: "Open Jamaah Makassar",
    city: "Makassar",
    destination: "Madinah",
    date: "28 Mei 2026",
    members: 4,
    seat: "Masih terbuka 3 kursi",
    focus: "Pilihan fleksibel untuk jamaah individu yang ingin berangkat lebih hemat.",
  },
  {
    name: "Keluarga Bandung Mandiri",
    city: "Bandung",
    destination: "Jeddah",
    date: "03 Juni 2026",
    members: 6,
    seat: "Masih terbuka 2 kursi",
    focus: "Akomodasi ramah keluarga dan alur perjalanan yang lebih santai.",
  },
  {
    name: "Jamaah Solo Hemat",
    city: "Solo",
    destination: "Madinah",
    date: "10 Juni 2026",
    members: 4,
    seat: "Masih terbuka 1 kursi",
    focus: "Untuk calon jamaah yang ingin ikut rombongan kecil dengan biaya lebih terukur.",
  },
];

export default function DaftarJamaahPage() {
  const router = useRouter();
  const [content, setContent] = useState<LandingContent>(defaultLandingContent);

  useEffect(() => {
    void fetch(apiUrl("/content/landing"))
      .then((res) => (res.ok ? res.json() : defaultLandingContent))
      .then((payload: LandingContent) => setContent(payload))
      .catch(() => setContent(defaultLandingContent));
  }, []);

  const goLogin = (label?: string) => {
    localStorage.setItem("redirect_after_login", "/menu");
    if (label) localStorage.setItem("selected_feature_label", label);
    router.push("/login");
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
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/84 sm:text-base sm:leading-7">
              Lihat daftar jamaah yang sedang menyiapkan keberangkatan umroh secara mandiri dan pilih rombongan yang paling sesuai ritme perjalanan Anda.
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
              onClick={() => goLogin("Gabung Jamaah")}
            >
              Gabung Sekarang
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-11 rounded-full border-white/18 bg-[rgba(79,83,86,0.44)] px-5 text-sm font-semibold text-white backdrop-blur-md hover:bg-[rgba(79,83,86,0.54)] sm:h-12 sm:px-6"
              onClick={() => router.push("/")}
            >
              Kembali ke Landing
              <ChevronDown className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="-mt-20 rounded-[26px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(255,251,243,0.82),rgba(250,244,233,0.78))] p-4 shadow-[0_24px_42px_rgba(108,82,39,0.1)] backdrop-blur-[6px] sm:-mt-24 sm:p-6">
        <div className="rounded-[22px] border border-[rgba(196,170,126,0.12)] bg-[rgba(255,252,246,0.78)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--secondary-strong)]">
            Umroh Mandiri
          </p>
          <h2 className="mt-2 max-w-[820px] font-[family-name:var(--font-display)] text-[1.25rem] leading-[1.55] text-[var(--foreground)] sm:text-[1.7rem]">
            Daftar jamaah yang akan berangkat mandiri
          </h2>
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[var(--muted-strong)] sm:text-[15px]">
            Halaman ini membantu Anda melihat rombongan yang sedang mencari teman perjalanan, kota asal keberangkatan, jadwal, dan sisa slot yang masih terbuka.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {jamaahList.map((jamaah) => (
            <Card
              key={`${jamaah.name}-${jamaah.date}`}
              className="rounded-[22px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(249,243,232,0.96))] p-5 shadow-[0_14px_26px_rgba(115,88,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                    Open Jamaah
                  </p>
                  <CardTitle className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] leading-tight">
                    {jamaah.name}
                  </CardTitle>
                </div>
                <div className="rounded-full bg-[rgba(214,177,110,0.16)] px-3 py-1 text-xs font-semibold text-[var(--secondary-strong)]">
                  {jamaah.seat}
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[var(--muted-strong)]">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[var(--primary)]" />
                  <span>
                    {jamaah.city} menuju {jamaah.destination}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
                  <span>{jamaah.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-[var(--primary)]" />
                  <span>{jamaah.members} orang dalam rombongan</span>
                </div>
              </div>

              <CardDescription className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
                {jamaah.focus}
              </CardDescription>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="sm" variant="secondary" onClick={() => goLogin(jamaah.name)}>
                  Gabung Rombongan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => goLogin(`Detail ${jamaah.name}`)}>
                  Lihat Detail
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
