"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBasket, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildDraftCartItems,
  calculateDraftTotals,
  useCalculatorDraft,
} from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

export function SharedCalculatorCart() {
  const { draft, resetDraft } = useCalculatorDraft();
  const [open, setOpen] = useState(false);

  const items = useMemo(() => buildDraftCartItems(draft), [draft]);
  const totals = useMemo(() => calculateDraftTotals(draft), [draft]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,var(--primary),var(--accent))] px-4 py-3 text-sm font-extrabold text-[#17322f] shadow-[0_18px_38px_rgba(20,36,34,0.24)] transition hover:-translate-y-0.5 lg:right-6"
      >
        <ShoppingBasket className="h-4 w-4" />
        Keranjang
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-black text-[var(--foreground)]">
          {items.length}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(14,21,24,0.52)] px-3 py-6" onClick={() => setOpen(false)}>
          <Card
            className="max-h-[88vh] w-full max-w-[1080px] overflow-hidden rounded-[26px] p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(196,170,126,0.16)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Keranjang bersama</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--foreground)]">Ringkasan kalkulator umroh</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-[rgba(27,89,81,0.08)] p-2 text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto px-5 py-5 sm:px-6">
              <div className="hidden grid-cols-[140px_minmax(0,1fr)_160px_120px_160px] gap-3 border-b border-[rgba(196,170,126,0.2)] pb-3 text-sm font-bold text-[var(--muted-strong)] md:grid">
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
                      className="grid gap-3 rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/85 px-4 py-4 md:grid-cols-[140px_minmax(0,1fr)_160px_120px_160px] md:items-center"
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
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] md:hidden">Harga satuan</p>
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
                  <div className="rounded-[18px] border border-dashed border-[rgba(196,170,126,0.28)] bg-[rgba(255,255,255,0.76)] px-4 py-6 text-sm text-[var(--muted-strong)]">
                    Belum ada item di keranjang bersama. Pilih tiket, hotel, visa, atau antar jemput dari halaman masing-masing.
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end">
                <p className="text-xl font-black text-[var(--foreground)]">Total: {formatRupiah(totals.grandTotal)}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="ghost" onClick={resetDraft}>
                  Bersihkan
                </Button>
                <Link href="/kalkulator" onClick={() => setOpen(false)}>
                  <Button variant="secondary">Buka Kalkulator</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
