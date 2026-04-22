import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { CalculatorDraft } from "@/lib/umroh-calculator-state";
import { calculateDraftTotals } from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

export function CalculatorSummary({
  draft,
  compact = false,
}: {
  draft: CalculatorDraft;
  compact?: boolean;
}) {
  const totals = calculateDraftTotals(draft);

  const lines = [
    { label: "Tiket", value: totals.ticketTotal },
    { label: "Hotel", value: totals.hotelTotal },
    { label: "Visa", value: totals.visaTotal },
    { label: "Antar Jemput", value: totals.transferTotal },
    { label: "Muthawif", value: totals.muthawifTotal },
  ];

  return (
    <Card className={`rounded-[24px] ${compact ? "p-5" : "p-6"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Ringkasan kalkulator</p>
      <CardTitle className="mt-3 font-[family-name:var(--font-display)] text-[2rem]">Total komponen biaya</CardTitle>
      <CardDescription className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
        Semua pilihan yang Anda simpan di tiket, hotel, visa, dan antar jemput akan muncul di sini.
      </CardDescription>

      <div className="mt-5 space-y-3">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between rounded-[16px] border border-[rgba(196,170,126,0.16)] bg-white/80 px-4 py-3 text-sm"
          >
            <span className="font-medium text-[var(--foreground)]">{line.label}</span>
            <span className="font-semibold text-[var(--muted-strong)]">{formatRupiah(line.value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[18px] bg-[linear-gradient(90deg,rgba(23,104,95,0.12),rgba(223,160,58,0.14))] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Grand Total</p>
        <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{formatRupiah(totals.grandTotal)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/kalkulator">
          <Button variant="secondary">Buka Kalkulator</Button>
        </Link>
        {!compact ? (
          <Link href="/menu?feature=bandingkan-harga">
            <Button variant="ghost">Kembali ke Dashboard</Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
