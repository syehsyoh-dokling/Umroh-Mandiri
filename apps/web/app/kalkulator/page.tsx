"use client";

import Link from "next/link";
import { Calculator, FileText, Hotel, Plane, Trash2, UserRound, Van } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  buildDraftCartItems,
  calculateDraftTotals,
  useCalculatorDraft,
} from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

const shortcuts = [
  { href: "/tiket", label: "+ Tiket", icon: Plane },
  { href: "/hotel", label: "+ Hotel", icon: Hotel },
  { href: "/visa", label: "+ Visa", icon: FileText },
  { href: "/antar-jemput", label: "+ Jemputan Bandara", icon: Van },
  { href: "/muthawif", label: "+ Muthawif", icon: UserRound },
];

export default function KalkulatorPage() {
  const { draft, resetDraft } = useCalculatorDraft();
  const items = buildDraftCartItems(draft);
  const totals = calculateDraftTotals(draft);

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Kalkulator Umroh"
      description="Halaman ini menjadi keranjang bersama. Setiap pilihan dari tiket, hotel, visa, antar jemput, dan muthawif akan masuk ke sini sebagai komponen biaya, bukan sebagai form."
      backHref="/menu?feature=kalkulator-umroh"
      backLabel="Kembali"
      showCalculatorCart
    >
      <section className="-mt-14 space-y-4 sm:-mt-16">
        <Card className="rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm leading-7 text-[var(--muted-strong)]">
                Bapak/Ibu <span className="font-bold text-[var(--foreground)]">Jamaah</span>, susun estimasi biaya perjalanan Anda.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant="secondary" className="rounded-full px-4">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={resetDraft}>
                <Trash2 className="h-4 w-4" />
                Bersihkan
              </Button>
              <Link href="/menu?feature=bandingkan-harga">
                <Button variant="ghost">Kembali ke Dashboard</Button>
              </Link>
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Status komponen</p>
              <CardTitle className="mt-3 font-[family-name:var(--font-display)] text-[1.8rem]">Ringkasan cepat</CardTitle>
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

            <Card className="rounded-[24px] p-5">
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.7rem]">Aksi berikutnya</CardTitle>
              <div className="mt-4 grid gap-3">
                <Link href="/tiket">
                  <Button variant="secondary" className="w-full justify-start">
                    Tambah komponen tiket
                  </Button>
                </Link>
                <Link href="/hotel">
                  <Button variant="ghost" className="w-full justify-start">
                    Pilih hotel Madinah & Makkah
                  </Button>
                </Link>
                <Link href="/antar-jemput">
                  <Button variant="ghost" className="w-full justify-start">
                    Tambah rute antar jemput
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </ModuleShell>
  );
}
