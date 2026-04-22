"use client";

import { useMemo, useState } from "react";
import { Hotel, MessageSquareMore, Search, Trash2 } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { formatRupiah, hotelBands } from "@/lib/travel-pricing";

type HotelApiItem = {
  id?: number;
  nama_hotel?: string;
  city?: string;
  bintang?: number;
  jarak_label?: string;
  harga_label?: string;
  price_idr?: number;
  price_usd?: number;
  beds_tersedia?: string;
  alamat?: string;
};

export default function HotelPage() {
  const { draft, setDraft } = useCalculatorDraft();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [city, setCity] = useState<"Madinah" | "Makkah">("Madinah");
  const [checkIn, setCheckIn] = useState(draft.journey.departDate || today);
  const [checkOut, setCheckOut] = useState(draft.journey.returnDate || tomorrow);
  const [starFilters, setStarFilters] = useState<string[]>([""]);
  const [band, setBand] = useState("");
  const [results, setResults] = useState<HotelApiItem[]>([]);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights = useMemo(() => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return Math.max(1, diff || (city === "Madinah" ? draft.journey.madinahNights : draft.journey.makkahNights));
  }, [checkIn, checkOut, city, draft.journey.madinahNights, draft.journey.makkahNights]);

  const activeHotel = useMemo(
    () => draft.hotels.find((item) => item.city === city) || null,
    [city, draft.hotels]
  );

  const starList = starFilters.filter(Boolean);

  const searchHotels = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        city,
        limit: "12",
      });

      if (starList.length) params.set("stars", starList.join(","));
      if (band) params.set("band", band);

      const res = await fetch(apiUrl(`/legacy-pricing/hotels?${params.toString()}`));
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.detail || data.error || "Gagal mengambil data hotel legacy.");
        setResults([]);
        return;
      }

      setResults(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke layanan hotel.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const saveHotel = (hotel: HotelApiItem) => {
    const nightlyPrice = Number(hotel.price_idr || 0);

    setDraft((current) => ({
      ...current,
      hotels: [
        ...current.hotels.filter((item) => item.city !== city),
        {
          city,
          hotelName: hotel.nama_hotel || "Hotel tanpa nama",
          stars: Number(hotel.bintang || 0) || undefined,
          radiusLabel: hotel.jarak_label || "",
          roomType: "Sesuai pilihan tersedia",
          nights,
          nightlyPrice,
          totalPrice: nightlyPrice * nights,
          source: "legacy-hotel-endpoint",
          raw: hotel as unknown as Record<string, unknown>,
        },
      ],
    }));
  };

  const resetFilters = () => {
    setStarFilters([""]);
    setBand("");
    setResults([]);
    setAssistantAnswer("");
    setAssistantQuestion("");
  };

  const askAssistant = () => {
    if (!assistantQuestion.trim()) return;
    setAssistantAnswer(
      `Pertanyaan Anda tersimpan: "${assistantQuestion}". Area ini saya pertahankan mengikuti legacy sebagai ruang bantu evaluasi hotel, dan langkah berikutnya saya akan sambungkan ke jawaban dinamis per hotel yang dipilih.`
    );
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Pesan Hotel Mandiri"
      description="Field legacy dipertahankan: pilih kota, check-in/check-out, kelas hotel, tambah kelas lain, radius ke masjid, hasil hotel, dan area tanya ke asisten."
      backHref="/kalkulator"
      backLabel="Kembali ke Kalkulator"
      showCalculatorCart
    >
      <section className="-mt-14 grid gap-4 sm:-mt-16 lg:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="text-center">
              <CardTitle className="font-[family-name:var(--font-display)] text-[2.1rem]">Pesan Hotel Mandiri</CardTitle>
              <CardDescription className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                Bapak/Ibu Jamaah, pilih kota dan filter lalu klik Cari Hotel.
              </CardDescription>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant={city === "Madinah" ? "secondary" : "ghost"} onClick={() => setCity("Madinah")}>
                Hotel di Madinah
              </Button>
              <Button variant={city === "Makkah" ? "secondary" : "ghost"} onClick={() => setCity("Makkah")}>
                Hotel di Makkah
              </Button>
            </div>

            <div className="mt-5 rounded-[22px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Check-in</label>
                  <Input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Check-out</label>
                  <Input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {starFilters.map((value, index) => (
                  <div key={`star-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_44px]">
                    <div className="space-y-2">
                      {index === 0 ? <label className="text-sm font-semibold text-[var(--muted-strong)]">Pilih Kelas Hotel (Bintang)</label> : null}
                      <Select
                        value={value}
                        onChange={(event) =>
                          setStarFilters((current) => current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)))
                        }
                      >
                        <option value="">Pilih bintang...</option>
                        <option value="2">Bintang 2</option>
                        <option value="3">Bintang 3</option>
                        <option value="4">Bintang 4</option>
                        <option value="5">Bintang 5</option>
                      </Select>
                    </div>
                    {index > 0 ? (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setStarFilters((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          className="rounded-full bg-red-50 p-3 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}

                <Button variant="ghost" onClick={() => setStarFilters((current) => [...current, ""])}>
                  + Tambah hotel kelas lain
                </Button>
              </div>

              <div className="mt-4 space-y-2 md:max-w-[320px]">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jarak ke Masjidil Haram / Nabawi</label>
                <Select value={band} onChange={(event) => setBand(event.target.value)}>
                  <option value="">Semua</option>
                  {hotelBands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={searchHotels} disabled={loading}>
                  <Search className="h-4 w-4" />
                  {loading ? "Mencari..." : "Cari Hotel"}
                </Button>
                <Button variant="ghost" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-[var(--muted-strong)]">{results.length} hotel ditemukan</p>

            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {results.map((hotel) => {
                const nightlyPrice = Number(hotel.price_idr || 0);
                return (
                  <Card key={`${hotel.id}-${hotel.nama_hotel}`} className="rounded-[22px] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                      {hotel.city || city} • {hotel.bintang || "-"} bintang
                    </p>
                    <CardTitle className="mt-3 font-[family-name:var(--font-display)] text-[1.7rem]">
                      {hotel.nama_hotel || "Hotel tanpa nama"}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                      {hotel.alamat || "Alamat hotel belum tersedia dari source legacy."}
                    </CardDescription>
                    <div className="mt-4 space-y-2 text-sm text-[var(--muted-strong)]">
                      <p>Radius: {hotel.jarak_label || "-"}</p>
                      <p>Kamar tersedia: {hotel.beds_tersedia || "-"}</p>
                      <p>Harga per malam: {nightlyPrice ? formatRupiah(nightlyPrice) : hotel.harga_label || "-"}</p>
                      <p>Total {nights} malam: {formatRupiah(nightlyPrice * nights)}</p>
                    </div>
                    <Button variant="secondary" className="mt-5" onClick={() => saveHotel(hotel)}>
                      Pilih hotel ini
                    </Button>
                  </Card>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                <MessageSquareMore className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Tanya ke Asisten Virtual (MUWAHID)</CardTitle>
                <CardDescription className="mt-1 text-sm text-[var(--muted-strong)]">
                  Respon MUWAHID akan muncul di sini.
                </CardDescription>
              </div>
            </div>

            <textarea
              value={assistantAnswer}
              readOnly
              className="mt-4 min-h-[120px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
            />
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Contoh: Tolong evaluasi hotel yang saya pilih, bagaimana lokasi, akses bus, sarapan, dan kekurangannya?"
              className="mt-3 min-h-[92px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
            />
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={askAssistant}>
                Kirim
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                <Hotel className="h-5 w-5" />
              </span>
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Hotel Aktif</CardTitle>
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{activeHotel?.hotelName || `Belum pilih hotel ${city}`}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
              {activeHotel
                ? `${activeHotel.nights} malam • ${activeHotel.radiusLabel || "-"} • ${formatRupiah(activeHotel.totalPrice)}`
                : "Pilih salah satu hotel dari hasil pencarian untuk masuk ke kalkulator."}
            </p>
          </Card>
        </div>
      </section>
    </ModuleShell>
  );
}
