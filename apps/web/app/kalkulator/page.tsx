"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, BookOpenCheck, BriefcaseBusiness, Calculator, FileText, Hotel, Languages, MapPinned, Plane, UserRound, Van } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  buildDraftCartItems,
  calculateDraftTotals,
  useCalculatorDraft,
} from "@/lib/umroh-calculator-state";
import { extractAirportCode, formatRupiah, kotaBandara } from "@/lib/travel-pricing";
import { useStoredAuthUser } from "@/lib/use-stored-auth-user";

const shortcuts = [
  { href: "/tiket", target: "tiket", label: "Cari Tiket Pesawat", icon: Plane },
  { href: "/antar-jemput", target: "antar-jemput", label: "Antar Jemput Bandara", icon: Van },
  { href: "/hotel", target: "hotel", label: "Pesan Hotel", icon: Hotel },
  { href: "/visa", target: "visa", label: "Urus Visa", icon: FileText },
  { href: "/muthawif", target: "muthawif", label: "Jasa Muthawif (optional)", icon: UserRound },
  {
    href: "/antar-jemput?feature=handling",
    target: "handling",
    label: "Jasa Handling Bandara (Optional)",
    icon: BriefcaseBusiness,
  },
];

const profileActions = [
  { href: "/register?mode=complete-profile", label: "Update Alamat", icon: MapPinned },
  { href: "/menu?feature=syarat-ketentuan", label: "Syarat & Ketentuan", icon: BookOpenCheck },
  { href: "/menu?feature=info-umroh", label: "Langganan Info / Berita Umroh", icon: Bell },
  { href: "/menu?feature=bicara", label: "Download Chat & Alih Bahasa", icon: Languages },
];

type AuthUser = {
  nama?: string;
  wa?: string;
  prov_id?: string | null;
  city_id?: string | null;
  dis_id?: string | null;
  desa_id?: string | null;
  region?: {
    province?: { name: string } | null;
    regency?: { name: string } | null;
    district?: { name: string } | null;
    village?: { name: string } | null;
    summary?: string;
  } | null;
};

function getRegionSummary(user: AuthUser | null) {
  const region = user?.region;
  if (region?.summary) return region.summary;
  return [region?.village?.name, region?.district?.name, region?.regency?.name, region?.province?.name]
    .filter(Boolean)
    .join(", ");
}

function isAddressComplete(user: AuthUser | null) {
  const region = user?.region;
  return Boolean(
    region?.summary ||
      (region?.province?.name && region?.regency?.name && region?.district?.name) ||
      (user?.prov_id && user?.city_id && user?.dis_id)
  );
}

function airportFullLabel(value: string) {
  const code = extractAirportCode(value);
  return kotaBandara.find((airport) => extractAirportCode(airport) === code) || value;
}

function transitSuggestion(value: string) {
  const code = extractAirportCode(value);
  if (code === "BKS") return "Jakarta/Medan";
  if (["BTJ", "KNO", "PDG", "PLM", "PKU", "BTH", "TNJ"].includes(code)) return "Jakarta/Medan";
  if (["BPN", "BDJ", "AAP", "UPG", "MDC", "TTE"].includes(code)) return "Jakarta/Makassar";
  if (["DPS", "LOP", "KOE"].includes(code)) return "Jakarta/Surabaya";
  return "Jakarta";
}

export default function KalkulatorPage() {
  const { draft } = useCalculatorDraft();
  const user = useStoredAuthUser<AuthUser>();
  const [sharingOptions, setSharingOptions] = useState<Record<string, boolean>>({});
  const items = buildDraftCartItems(draft);
  const totals = calculateDraftTotals(draft);
  const displayName = user?.nama?.trim() || "Jamaah";
  const regionSummary = getRegionSummary(user) || "domisili yang sudah tersimpan";
  const addressComplete = isAddressComplete(user);
  const originName = airportFullLabel(draft.journey.origin || "Bengkulu (BKS)");
  const transitName = transitSuggestion(originName);

  const missingRecommendations = useMemo(() => {
    const required = [
      { key: "ticket", label: "Cari tiket pesawat", href: "/tiket", done: totals.ticketTotal > 0 },
      { key: "hotel", label: "Pesan hotel", href: "/hotel", done: totals.hotelTotal > 0 },
      { key: "transfer", label: "Atur antar jemput bandara", href: "/antar-jemput", done: totals.transferTotal > 0 },
      { key: "visa", label: "Urus visa", href: "/visa", done: totals.visaTotal > 0 },
    ];

    return required.filter((item) => !item.done);
  }, [totals.hotelTotal, totals.ticketTotal, totals.transferTotal, totals.visaTotal]);

  const sharingLabels = [
    `Saya mau berangkat bareng dari ${originName}`,
    `Saya mau ketemu di bandara transit (${transitName})`,
    "Saya mau ketemu di Bandara Jeddah/Madinah",
    "Boleh sharing mobil jemputan",
    "Boleh berbagi kamar hotel (bed sharing)",
    "Saya mau pakai jasa Muthawif tapi dibayar bersama",
    "Boleh tampilkan nama dan tanggal keberangkatan saya",
    "Jangan tampilkan nomor HP/WA saya",
    "Hubungi saya hanya melalui chat di aplikasi MUWAHID",
  ];
  const noneSharingKey = "Tidak satu pun dari pilihan di atas";
  const allSharingSelected = sharingLabels.every((label) => sharingOptions[label]);
  const noneSharingSelected = Boolean(sharingOptions[noneSharingKey]);

  const toggleAllSharing = (checked: boolean) => {
    if (!checked) {
      setSharingOptions({});
      return;
    }

    setSharingOptions(
      sharingLabels.reduce<Record<string, boolean>>((acc, label) => {
        acc[label] = true;
        return acc;
      }, {})
    );
  };

  const toggleSharing = (label: string, checked: boolean) => {
    setSharingOptions((prev) => {
      const next = { ...prev, [label]: checked };
      if (label === noneSharingKey && checked) {
        return { [noneSharingKey]: true };
      }
      if (checked) delete next[noneSharingKey];
      return next;
    });
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Kalkulator Umroh"
      description="Halaman ini menggabungkan dan menghitung semua rencana anggaran untuk umroh secara real-time. Setiap pilihan dari halaman tiket, hotel, visa, antar jemput, dan muthawif akan masuk ke sini sebagai komponen biaya total."
      sectionTitle="Kalkulator Umroh"
      sectionDescription="Halaman ini menggabungkan dan menghitung semua rencana anggaran untuk umroh secara real-time. Setiap pilihan dari halaman tiket, hotel, visa, antar jemput, dan muthawif akan masuk ke sini sebagai komponen biaya total."
      actions={shortcuts.map((item) => ({
        label: item.label,
        target: item.target,
        icon: item.icon,
      }))}
      backHref="/menu?feature=kalkulator-umroh"
      backLabel="Kembali"
      showCalculatorCart
      surfaceContent={
        <div className="p-2 sm:p-3">
          <p className="text-sm leading-7 text-[var(--muted-strong)]">
            {addressComplete ? (
              <>
                Kami akan mempersiapkan asal keberangkatan dan rekomendasi lainnya berdasarkan alamat{" "}
                <span className="font-bold text-[var(--foreground)]">{regionSummary}</span>. Jika belum sesuai, silakan update pada tombol di bawah ini.
              </>
            ) : (
              <>
                Bapak/Ibu <span className="font-bold text-[var(--foreground)]">{displayName}</span>, agar pencarian tiket pesawat dan lainnya sesuai dengan asal keberangkatan Anda, mohon melengkapi alamat sesuai domisili keberangkatan yang direncanakan. Pilih tombol <span className="font-bold text-[var(--foreground)]">Update Alamat</span> di bawah ini.
              </>
            )}
          </p>

          <div className="post-auth-action-grid mt-4">
            {profileActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <span className="post-auth-action-button">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      }
    >
      <section className="mt-4 space-y-4">
        <Card className="rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="dashboard-chip-label text-left">Kalkulator Umroh</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                Halaman ini menggabungkan dan menghitung semua rencana anggaran untuk umroh secara real-time. Setiap pilihan dari halaman tiket, hotel, visa, antar jemput, dan muthawif akan masuk ke sini sebagai komponen biaya total.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {shortcuts.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <span className={`hero-menu-button hero-menu-tone-${index % 4} h-full min-h-12 px-3 py-3`}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </span>
                      <span aria-hidden>→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_320px]">
          <Card className="rounded-[26px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                  <Calculator className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="font-[family-name:var(--font-display)] text-[2rem]">Keranjang</CardTitle>
                  <CardDescription className="mt-1 text-sm text-[var(--muted-strong)]">
                    Harga aktual mengikuti pilihan yang sudah Anda simpan di halaman modul masing-masing.
                  </CardDescription>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--muted-strong)]">
                Tanggal: {new Date().toLocaleDateString("id-ID")}
              </p>
            </div>

            <div className="mt-5 hidden grid-cols-[120px_minmax(0,1fr)_160px_90px_160px] gap-3 border-b border-[rgba(196,170,126,0.22)] pb-3 text-sm font-bold text-[var(--muted-strong)] md:grid">
              <span>Tipe</span>
              <span>Deskripsi</span>
              <span>Harga Satuan</span>
              <span>Qty</span>
              <span>Subtotal</span>
            </div>

            <div className="mt-3 space-y-3">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 px-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_160px_90px_160px] md:items-center"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Tipe</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{item.type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Deskripsi</p>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{item.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Harga Satuan</p>
                      <p className="text-sm font-semibold text-[var(--muted-strong)]">{formatRupiah(item.unitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Qty</p>
                      <p className="text-sm font-semibold text-[var(--muted-strong)]">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Subtotal</p>
                      <p className="text-sm font-black text-[var(--foreground)]">{formatRupiah(item.subtotal)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[rgba(196,170,126,0.28)] bg-[rgba(255,255,255,0.78)] px-4 py-8 text-sm text-[var(--muted-strong)]">
                  Belum ada komponen biaya yang tersimpan. Silakan buka halaman tiket, hotel, visa, atau antar jemput untuk mulai menghitung.
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <p className="text-2xl font-black text-[var(--foreground)]">Total: {formatRupiah(totals.grandTotal)}</p>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[24px] p-5">
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.7rem]">Rekomendasi Berikutnya</CardTitle>
              <div className="mt-4 grid gap-3">
                {missingRecommendations.length ? (
                  missingRecommendations.map((item) => (
                    <Link key={item.key} href={item.href}>
                      <Button variant={item.key === missingRecommendations[0].key ? "secondary" : "ghost"} className="w-full justify-start">
                        {item.label}
                      </Button>
                    </Link>
                  ))
                ) : (
                  <>
                    <p className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4 text-sm leading-7 text-[var(--muted-strong)]">
                      Jasa Muthawif sangat disarankan, tapi jika tidak ada pun tidak akan mempengaruhi administrasi Anda. Mau sekalian dicarikan?
                    </p>
                    <Link href="/muthawif">
                      <Button variant="secondary" className="w-full justify-start">Carikan Muthawif</Button>
                    </Link>
                    <p className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4 text-sm leading-7 text-[var(--muted-strong)]">
                      Handling bandara juga optional, tetapi bisa membantu saat membawa keluarga atau banyak koper.
                    </p>
                    <Link href="/antar-jemput?feature=handling">
                      <Button variant="ghost" className="w-full justify-start">Cek Handling Bandara</Button>
                    </Link>
                  </>
                )}
              </div>
            </Card>

            <Card className="rounded-[24px] p-5">
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Ringkasan Cepat</CardTitle>
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Tiket</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(totals.ticketTotal)}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Hotel</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(totals.hotelTotal)}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Visa</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(totals.visaTotal)}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Jemputan Bandara</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(totals.transferTotal)}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Muthawif</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(totals.muthawifTotal)}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="rounded-[26px] p-5 sm:p-6">
          <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Preferensi bergabung dengan jamaah lain</CardTitle>
          <CardDescription className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            Jika Bapak/Ibu ingin menerima atau ingin bergabung dengan jamaah lain baik dalam persiapan keberangkatan, pengurusan visa, join mobil jemputan di Bandara dan menggunakan hotel yang sama, silakan centang satu atau semua persetujuan berikut:
          </CardDescription>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="flex items-start gap-3 rounded-[18px] border border-[rgba(31,120,107,0.24)] bg-[linear-gradient(135deg,rgba(42,143,122,0.16),rgba(241,180,72,0.24))] px-4 py-3 text-sm font-bold leading-6 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded accent-[var(--primary)]"
                checked={allSharingSelected}
                onChange={(event) => toggleAllSharing(event.target.checked)}
              />
              <span>Centang semua pilihan</span>
            </label>
            {sharingLabels.map((label) => (
              <label
                key={label}
                className="flex items-start gap-3 rounded-[18px] border border-[rgba(31,120,107,0.18)] bg-[linear-gradient(135deg,rgba(234,246,241,0.94),rgba(255,232,190,0.86))] px-4 py-3 text-sm font-semibold leading-6 text-[var(--foreground)] shadow-[0_10px_22px_rgba(44,88,69,0.08),inset_0_1px_0_rgba(255,255,255,0.72)]"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded accent-[var(--primary)]"
                  checked={Boolean(sharingOptions[label])}
                  onChange={(event) => toggleSharing(label, event.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
            <label className="flex items-start gap-3 rounded-[18px] border border-[rgba(31,120,107,0.24)] bg-[linear-gradient(135deg,rgba(255,244,222,0.96),rgba(233,176,63,0.24))] px-4 py-3 text-sm font-bold leading-6 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] lg:col-span-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded accent-[var(--secondary-strong)]"
                checked={noneSharingSelected}
                onChange={(event) => toggleSharing(noneSharingKey, event.target.checked)}
              />
              <span>Tidak satu pun dari pilihan di atas</span>
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold text-[var(--muted-strong)]">
            Minimal pilih satu preferensi, atau centang “Tidak satu pun dari pilihan di atas”.
          </p>
        </Card>
      </section>
    </ModuleShell>
  );
}
