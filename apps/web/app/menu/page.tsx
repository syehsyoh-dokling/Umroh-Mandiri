"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bus,
  FileText,
  Gift,
  Headphones,
  Hotel,
  Languages,
  LogOut,
  MapPinned,
  MoonStar,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/site/brand-mark";
import { PostAuthFooter } from "@/components/site/post-auth-footer";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/config";
import { getFeatureRoute } from "@/lib/feature-routes";

type AuthUser = {
  id?: number;
  nama?: string;
  email?: string;
  role?: string;
  wa?: string;
  referral_code?: string;
  prov_id?: string | null;
  city_id?: string | null;
  dis_id?: string | null;
  desa_id?: string | null;
  region?: {
    province?: { id: string; name: string } | null;
    regency?: { id: string; name: string } | null;
    district?: { id: string; name: string } | null;
    village?: { id: string; name: string } | null;
    summary?: string;
  } | null;
};

type MenuItem = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const menuGroups: { left: MenuItem[]; right: MenuItem[] } = {
  left: [
    {
      key: "persiapan",
      title: "Persiapan Keberangkatan",
      description: "Checklist dokumen, vaksin, dan kesiapan awal jamaah.",
      icon: ShieldCheck,
      accent: "from-[#f3b343] to-[#e58a29]",
    },
    {
      key: "promo",
      title: "Gelar Promo",
      description: "Lihat promo paket aktif, cicilan, dan penawaran terbaru.",
      icon: Gift,
      accent: "from-[#f0bd54] to-[#f3a84b]",
    },
    {
      key: "tiket",
      title: "Cari Tiket",
      description: "Bandingkan penerbangan untuk rute keberangkatan paling sesuai.",
      icon: Ticket,
      accent: "from-[#f2b74c] to-[#dc8f2b]",
    },
    {
      key: "hotel",
      title: "Pesan Hotel",
      description: "Cari area menginap yang nyaman dekat titik ibadah utama.",
      icon: Hotel,
      accent: "from-[#f6c363] to-[#eaa23f]",
    },
    {
      key: "bimbingan",
      title: "Bimbingan Online",
      description: "Pendampingan digital untuk ritme ibadah yang lebih terarah.",
      icon: Headphones,
      accent: "from-[#f7c86a] to-[#d88b25]",
    },
    {
      key: "arah",
      title: "Pemandu Arah",
      description: "Panduan orientasi lokasi agar mobilitas jamaah lebih mudah.",
      icon: Route,
      accent: "from-[#f2b54d] to-[#de902b]",
    },
    {
      key: "muthawif",
      title: "Kontak Muthawif",
      description: "Akses bantuan lapangan dan pendamping ibadah.",
      icon: UserRound,
      accent: "from-[#f4be58] to-[#dc8b28]",
    },
    {
      key: "bicara",
      title: "Penerjemah Digital",
      description: "Bantuan komunikasi cepat selama berada di Arab Saudi.",
      icon: Languages,
      accent: "from-[#f5c86a] to-[#de9938]",
    },
    {
      key: "catering",
      title: "Catering Indonesia",
      description: "Pilihan konsumsi yang lebih dekat dengan lidah jamaah Indonesia.",
      icon: Gift,
      accent: "from-[#f7c764] to-[#e4a23e]",
    },
  ],
  right: [
    {
      key: "bandingkan-harga",
      title: "Keberangkatan Terdekat",
      description: "Pantau keberangkatan jamaah lain dan peluang gabung rombongan.",
      icon: Plane,
      accent: "from-[#eef7ef] to-[#d8efe5]",
    },
    {
      key: "bandingkan-harga",
      title: "Kalkulator Umroh",
      description: "Hitung simulasi biaya umroh mandiri maupun via travel.",
      icon: WalletCards,
      accent: "from-[#edf7ef] to-[#d4ecdf]",
    },
    {
      key: "umroh-ramadhan",
      title: "Umroh I'tikaf",
      description: "Pilihan paket fokus Ramadhan hingga 10 malam terakhir.",
      icon: MoonStar,
      accent: "from-[#eef6ee] to-[#d9ecde]",
    },
    {
      key: "visa",
      title: "Urus Visa",
      description: "Panduan administrasi, approval, dan syarat dokumen.",
      icon: FileText,
      accent: "from-[#eef7ef] to-[#d4ecdf]",
    },
    {
      key: "panduan",
      title: "Panduan Umroh",
      description: "Ringkasan amalan, alur ibadah, dan panduan lapangan.",
      icon: MapPinned,
      accent: "from-[#edf7ef] to-[#d7eee3]",
    },
    {
      key: "antarjemput",
      title: "Antar Jemput Bandara",
      description: "Atur jemputan setiba di Arab maupun perjalanan pulang.",
      icon: Bus,
      accent: "from-[#edf7ef] to-[#d2eadc]",
    },
    {
      key: "transportasi",
      title: "Taksi / Bus",
      description: "Kebutuhan transport lokal untuk mobilitas harian jamaah.",
      icon: Bus,
      accent: "from-[#eef7ef] to-[#d9ece0]",
    },
    {
      key: "belanja",
      title: "Belanja / Wisata",
      description: "Panduan oleh-oleh, wisata, dan kebutuhan tambahan perjalanan.",
      icon: Sparkles,
      accent: "from-[#eff7ef] to-[#dbeee3]",
    },
    {
      key: "handling",
      title: "Air Zamzam / Handling",
      description: "Bantuan kebutuhan kepulangan dan penanganan bawaan jamaah.",
      icon: Gift,
      accent: "from-[#eef7ef] to-[#d4ece0]",
    },
    {
      key: "loundry",
      title: "Laundry",
      description: "Kelola kebutuhan laundry selama masa tinggal.",
      icon: ShieldCheck,
      accent: "from-[#eef7ef] to-[#d9eee1]",
    },
  ],
};

function buildPageCode(feature: string) {
  return `${feature}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRegionText(user: AuthUser | null) {
  const summary = user?.region?.summary?.trim();
  if (summary) return summary;

  return [user?.region?.village?.name, user?.region?.district?.name, user?.region?.regency?.name, user?.region?.province?.name]
    .filter(Boolean)
    .join(", ");
}

function isRegionComplete(user: AuthUser | null) {
  return Boolean(user?.prov_id && user?.city_id && user?.dis_id && user?.desa_id);
}

function LoginDecisionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,29,24,0.38)] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="w-full max-w-[560px] rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(252,244,231,0.94))] p-6 shadow-[var(--shadow-strong)] backdrop-blur-md sm:p-8"
          >
            <div className="flex items-center gap-4">
              <BrandMark className="h-16 w-16 rounded-[20px]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">MUWAHID</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--foreground)]">{title}</h2>
              </div>
            </div>
            <p className="mt-5 text-base leading-8 text-[var(--muted-strong)]">{description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="w-full" onClick={onConfirm}>
                {confirmLabel}
              </Button>
              <Button variant="ghost" className="w-full" onClick={onCancel}>
                {cancelLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function MenuPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedFeature, setSelectedFeature] = useState("persiapan");
  const [isReady, setIsReady] = useState(false);
  const [entryPromptOpen, setEntryPromptOpen] = useState(false);
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [showFocusedModule, setShowFocusedModule] = useState(false);
  const [pageFeature, setPageFeature] = useState("");
  const moduleSectionRef = useRef<HTMLElement | null>(null);

  const allMenus = useMemo(() => [...menuGroups.left, ...menuGroups.right], []);
  const currentModule =
    allMenus.find((item) => item.key === selectedFeature) ??
    allMenus.find((item) => item.key === pageFeature) ??
    menuGroups.left[0];

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams(window.location.search);
    const requestedFeature = params.get("feature") || "";
    const requestedPageCode = params.get("page_code") || "";
    setPageFeature(requestedFeature);

    if (!token) {
      const target = window.location.pathname + window.location.search;
      localStorage.setItem("redirect_after_login", target);
      router.replace(`/login?next=${encodeURIComponent(target)}`);
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(apiUrl("/users/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Gagal memuat profil.");
        }

        const payload = await res.json();
        const profile = payload.user as AuthUser;
        setUser(profile);
        setSelectedFeature(requestedFeature || localStorage.getItem("selected_feature_key") || "persiapan");
        localStorage.setItem(
          "auth_user",
          JSON.stringify({
            id: profile.id,
            nama: profile.nama,
            email: profile.email,
            role: profile.role,
          })
        );

        if (requestedFeature) {
          localStorage.setItem("selected_feature_key", requestedFeature);
        }

        if (requestedPageCode) {
          localStorage.setItem("selected_page_code", requestedPageCode);
        }

        const pendingPrompt = localStorage.getItem("post_login_prompt_pending");
        const shouldShowEntryPrompt =
          Boolean(requestedFeature) && Boolean(pendingPrompt) && (!requestedPageCode || pendingPrompt === requestedPageCode || pendingPrompt === "menu");

        if (shouldShowEntryPrompt) {
          setEntryPromptOpen(true);
          localStorage.removeItem("post_login_prompt_pending");
        }

        if (!isRegionComplete(profile)) {
          setProfilePromptOpen(true);
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("auth_user");
        router.replace("/login");
        return;
      } finally {
        setIsReady(true);
      }
    };

    void loadProfile();
  }, [router]);

  useEffect(() => {
    if (!showFocusedModule) return;
    moduleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showFocusedModule]);

  const handleMenuOpen = (feature: string) => {
    const nextPageCode = buildPageCode(feature);
    const destination = getFeatureRoute(feature, "/menu");
    localStorage.setItem("selected_feature_key", feature);
    localStorage.setItem("selected_page_code", nextPageCode);
    localStorage.setItem("selected_feature_label", allMenus.find((item) => item.key === feature)?.title || feature);
    setSelectedFeature(feature);
    setShowFocusedModule(true);
    router.replace(`${destination}?feature=${feature}&page_code=${nextPageCode}`);
  };

  const handleContinueChosenMenu = () => {
    setEntryPromptOpen(false);
    setShowFocusedModule(true);
  };

  const handleShowFullDashboard = () => {
    setEntryPromptOpen(false);
    setShowFocusedModule(false);
    setSelectedFeature("persiapan");
    router.replace("/menu");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_meta");
    router.push("/login");
  };

  const goCompleteProfile = () => {
    setProfilePromptOpen(false);
    router.push("/register?mode=complete-profile");
  };

  const regionText = getRegionText(user);
  const CurrentModuleIcon = currentModule.icon;

  if (!isReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1360px] px-4 py-5 sm:px-6 lg:px-8">
        <Card className="rounded-[34px] p-8 text-center lg:p-12">
          <BrandMark className="mx-auto h-16 w-16" />
          <CardTitle className="mt-4 font-[family-name:var(--font-display)] text-4xl">Menyiapkan dashboard MUWAHID...</CardTitle>
        </Card>
      </main>
    );
  }

  return (
    <main className="post-auth-shell">
      <LoginDecisionModal
        open={entryPromptOpen}
        title="Selamat datang di dashboard MUWAHID"
        description={`Apakah Anda ingin melanjutkan ke "${currentModule.title}" seperti menu yang dipilih sebelumnya sebelum login?`}
        confirmLabel="Ya, lanjutkan"
        cancelLabel="Tidak, tampilkan dashboard"
        onConfirm={handleContinueChosenMenu}
        onCancel={handleShowFullDashboard}
      />

      <LoginDecisionModal
        open={!entryPromptOpen && profilePromptOpen}
        title="Profil wilayah belum lengkap"
        description="Asal wilayah Anda belum lengkap. Agar dashboard dan rekomendasi lebih valid, mohon lengkapi nama, email, nomor HP, dan domisili Anda terlebih dahulu."
        confirmLabel="Lengkapi profil"
        cancelLabel="Nanti dulu"
        onConfirm={goCompleteProfile}
        onCancel={() => setProfilePromptOpen(false)}
      />

      <section className="post-auth-hero">
        <div className="post-auth-hero-fade" aria-hidden />

        <div className="post-auth-hero-inner">
          <div className="post-auth-topbar">
            <Link href="/beranda">
              <Button variant="ghost" className="h-10 min-w-[118px] rounded-full bg-white/18 px-4 text-sm text-white hover:bg-white/24 hover:text-white">
                Kembali
              </Button>
            </Link>

            <div className="flex justify-center" />

            <div className="flex justify-end">
              <Button variant="secondary" onClick={logout} className="h-10 w-[118px] rounded-full px-4 text-sm">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <div className="post-auth-brand">
            <div className="post-auth-brand-mark">
              <BrandMark className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
            <h1 className="post-auth-brand-title">MUWAHID</h1>
            <p className="post-auth-brand-tagline">
              Asisten virtual yang siap membantu dan menjadikan umroh Anda semudah pulang kampung
            </p>
          </div>

          <div className="post-auth-intro">
            <p className="post-auth-intro-title">
              Bapak/Ibu {user?.nama || "Jamaah MUWAHID"}, Semoga Ibadah Umroh Anda
            </p>
            <p className="post-auth-intro-subtitle">Mabrur dan diterima di sisi Allah SWT.</p>
          </div>
        </div>
      </section>

      <div className="post-auth-surface">
        <Card className="post-auth-card p-3">
          <div className="px-2 pb-4 pt-1 text-center">
            <p className="dashboard-chip-label">Dashboard / Menu Utama</p>
            <p className="dashboard-chip-copy">
              Untuk mulai menjelajah, pilih salah satu menu sesuai dengan kebutuhan Anda, tapi sangat kami sarankan agar mendapatkan pemahaman yang utuh mulailah dengan membaca persyaratan pada menu &ldquo;Persiapan Keberangkatan&rdquo; baru dilanjutkan dengan menu yang lainnya.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Persiapan Keberangkatan", target: "persiapan", icon: ShieldCheck },
              { label: "Cari Tiket", target: "tiket", icon: Ticket },
              { label: "Urus Visa", target: "visa", icon: FileText },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuOpen(item.target)}
                  className={`hero-menu-button hero-menu-tone-${index} hover:brightness-[1.02]`}
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

      <section ref={moduleSectionRef} className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="rounded-[32px] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Fokus saat ini</p>
          <div className="mt-4 rounded-[26px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,254,250,0.92),rgba(255,248,235,0.84))] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(23,104,95,0.08)] text-[var(--primary)]">
                <CurrentModuleIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  {showFocusedModule ? "Menu pilihan sebelumnya" : "Dashboard utama"}
                </p>
                <CardTitle className="mt-2 font-[family-name:var(--font-display)] text-4xl">{currentModule.title}</CardTitle>
                <CardDescription className="mt-3 text-base leading-7 text-[var(--muted-strong)]">
                  {currentModule.description}
                </CardDescription>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => handleMenuOpen(currentModule.key)}>
                    Buka menu ini
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!isRegionComplete(user) ? (
                    <Button variant="ghost" onClick={goCompleteProfile}>
                      Lengkapi wilayah dulu
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[32px] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Identitas jamaah</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[color:var(--line)] bg-white/78 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Email</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{user?.email || "-"}</p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--line)] bg-white/78 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nomor HP</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{user?.wa || "Belum diisi"}</p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--line)] bg-white/78 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Domisili terdaftar</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{regionText || "Belum dilengkapi"}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        {[menuGroups.left, menuGroups.right].map((column, columnIndex) => (
          <Card key={columnIndex} className="rounded-[32px] p-5 sm:p-6">
            <div className="space-y-3">
              {column.map((item) => {
                const Icon = item.icon;
                const active = item.key === selectedFeature;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleMenuOpen(item.key)}
                    className={`group flex w-full items-center justify-between gap-4 rounded-[20px] border px-4 py-3 text-left transition duration-200 ${
                      active
                        ? "border-transparent bg-[linear-gradient(90deg,#f0b33f,#e08f27)] text-white shadow-[0_16px_28px_rgba(219,145,43,0.22)]"
                        : "border-[color:var(--line)] bg-[linear-gradient(90deg,rgba(255,252,246,0.96),rgba(255,247,231,0.9))] hover:-translate-y-0.5 hover:border-[rgba(223,160,58,0.25)]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${
                          active ? "from-white/24 to-white/10 text-white" : "from-[#f2b74c] to-[#dc8f2b] text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-base font-semibold ${active ? "text-white" : "text-[var(--foreground)]"}`}>
                          {item.title}
                        </p>
                        <p className={`truncate text-xs ${active ? "text-white/80" : "text-[var(--muted)]"}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition ${active ? "text-white" : "text-[var(--muted)] group-hover:translate-x-1"}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-6 pb-10">
        <Card className="rounded-[32px] p-6 text-center sm:p-8">
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Penafian (Disclaimer)
          </CardTitle>
          <CardDescription className="mx-auto mt-3 max-w-[760px] text-base leading-8 text-[var(--muted-strong)]">
            Website ini bukan milik travel umroh, tapi milik Yayasan Bani Saifuddin Indonesia Maju (Banisa Maju) yang diberi nama MUWAHID dan didedikasikan untuk membantu para jamaah dan calon jamaah umroh asal Indonesia agar bisa melakukan dan mengelola perjalanan umroh secara mandiri. MUWAHID menyediakan berbagai menu untuk berbagai tingkatan keperluan misalnya bergabung dengan komunitas, informasi pra keberangkatan, persiapan administrasi, panduan keberangkatan, panduan ibadah, penerjemah digital dan layanan bimbingan serta diskusi online, juga berbagai menu pendukung lainnya.
          </CardDescription>
        </Card>
      </section>
      <PostAuthFooter />
    </main>
  );
}
