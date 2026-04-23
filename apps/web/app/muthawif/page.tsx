"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Square, UserRound, Volume2, WandSparkles } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

type MuthawifItem = {
  id: number;
  nama: string;
  alamat?: string;
  email?: string;
  wa?: string;
  foto_url?: string;
  meet_spots?: string;
  rating?: number;
};

const meetOptions = [
  "Clock Tower",
  "Ajyad",
  "Misfalah",
  "Aziziyah",
  "Masjid Nabawi",
  "Raudhah",
];

export default function MuthawifPage() {
  const { draft, setDraft } = useCalculatorDraft();

  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingSpot, setMeetingSpot] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MuthawifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<MuthawifItem | null>(null);

  const helperText = useMemo(() => {
    if (!selected) return "Catatan akan tampil di sini setelah Anda bertanya. Anda juga bisa membacakan catatan/jawaban.";
    return `Muthawif terpilih: ${selected.nama}${selected.wa ? ` • WA ${selected.wa}` : ""}${selected.rating ? ` • Rating ${selected.rating}` : ""}`;
  }, [selected]);

  const searchMuthawif = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "12" });
      if (query.trim()) params.set("q", query.trim());
      if (meetingSpot) params.set("meet", meetingSpot);
      if (meetingDate) params.set("date", meetingDate);

      const res = await fetch(apiUrl(`/legacy-pricing/muthawif?${params.toString()}`));
      const data = await res.json();
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void searchMuthawif();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySelection = (item: MuthawifItem) => {
    setSelected(item);
    setNotes(
      `Kontak muthawif ditemukan: ${item.nama}${item.alamat ? `, ${item.alamat}` : ""}${item.wa ? `. Hubungi via WA: ${item.wa}.` : "."}`
    );
    setDraft((current) => ({
      ...current,
      muthawif: {
        name: item.nama,
        totalPrice: current.muthawif?.totalPrice || 0,
        notes: `Pertemuan ${meetingDate}${meetingSpot ? ` di ${meetingSpot}` : ""}`,
      },
    }));
  };

  const clearAssistant = () => {
    setQuestion("");
    setNotes("");
  };

  const sendQuestion = () => {
    if (!question.trim()) return;
    setNotes(
      `${helperText}\n\nPertanyaan Anda tersimpan: "${question}". Pada tahap berikutnya jawaban ini akan dihubungkan ke panduan talkin dan alur konsultasi muthawif yang lebih lengkap.`
    );
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Layanan Muthawif (Pemandu Ibadah)"
      description="Form utama legacy dipertahankan: tanggal & lokasi pertemuan, pencarian nama/alamat, area jawaban/catatan, serta area pertanyaan Anda."
      backHref="/kalkulator"
      backLabel="Kembali ke Kalkulator"
      showCalculatorCart
    >
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-[24px] p-5 sm:p-6">
            <CardTitle className="font-[family-name:var(--font-display)] text-[2rem]">Pilih Tanggal &amp; Lokasi Pertemuan</CardTitle>

            <div className="mt-4 grid gap-3 md:grid-cols-[180px_220px_minmax(0,1fr)_140px]">
              <Input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
              <Select value={meetingSpot} onChange={(event) => setMeetingSpot(event.target.value)}>
                <option value="">Pilih Lokasi Ketemu</option>
                {meetOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama/alamat..." />
              <Button variant="secondary" onClick={searchMuthawif} disabled={loading}>
                {loading ? "Memuat..." : "Terapkan"}
              </Button>
            </div>

            <p className="mt-3 text-sm text-[var(--muted-strong)]">
              Tip: Klik ikon email/WA di kartu untuk menghubungi muthawif. Pesan WA otomatis akan mengikuti tahap pengembangan berikutnya.
            </p>

            <div className="mt-4 space-y-3">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[18px] border p-4 transition ${
                      selected?.id === item.id
                        ? "border-[rgba(223,160,58,0.34)] bg-[rgba(255,244,226,0.84)]"
                        : "border-[rgba(196,170,126,0.16)] bg-white/82"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--foreground)]">{item.nama}</p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">{item.alamat || "Alamat belum tersedia"}</p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {item.meet_spots || "Spot temu belum tersedia"} {item.rating ? `• Rating ${item.rating}` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" onClick={() => applySelection(item)}>
                        Pilih
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[rgba(196,170,126,0.26)] bg-white/78 px-4 py-5 text-sm text-[var(--muted-strong)]">
                  Gagal memuat data atau belum ada hasil yang cocok. Coba ubah tanggal, lokasi, atau kata kunci pencarian.
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-[24px] p-5 sm:p-6">
            <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Jawaban / Catatan</CardTitle>
            <textarea
              value={notes}
              readOnly
              placeholder={helperText}
              className="mt-4 min-h-[150px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
            />
            <p className="mt-3 text-sm text-[var(--muted-strong)]">
              Untuk bimbingan fiqih detail, utamakan bertanya ke Ustadz/Ustadzah atau Muthawif Anda.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="ghost">
                <Volume2 className="h-4 w-4" />
                Bacakan Jawaban
              </Button>
              <Button variant="ghost">Jeda</Button>
              <Button variant="ghost">Lanjut</Button>
              <Button variant="ghost">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
          </Card>

          <Card className="rounded-[24px] p-5 sm:p-6">
            <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Pertanyaan Anda</CardTitle>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Tulis pertanyaan atau catatan (mis. jadwal, titik temu, kebutuhan khusus)..."
              className="mt-4 min-h-[150px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="ghost">
                <Mic className="h-4 w-4" />
                Gunakan Mikrofon
              </Button>
              <Button variant="secondary" onClick={sendQuestion}>
                <WandSparkles className="h-4 w-4" />
                Kirim ke GPT
              </Button>
              <Button variant="ghost" onClick={clearAssistant}>
                Bersihkan
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                <UserRound className="h-5 w-5" />
              </span>
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Muthawif Aktif</CardTitle>
            </div>
            <p className="mt-4 text-sm text-[var(--muted-strong)]">
              {draft.muthawif
                ? `${draft.muthawif.name} • ${formatRupiah(draft.muthawif.totalPrice)}`
                : "Belum ada muthawif yang dipilih. Sesuai arahan sebelumnya, komponen ini tetap boleh kosong."}
            </p>
          </Card>
        </div>
      </section>
    </ModuleShell>
  );
}
