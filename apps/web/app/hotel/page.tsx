"use client";

import { useMemo, useState } from "react";
import { Building2, FileQuestion, Hotel, ReceiptText, Search, Trash2 } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { MuwahidAssistant } from "@/components/site/muwahid-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { formatRupiah, hotelBands } from "@/lib/travel-pricing";

type HotelCity = "Makkah" | "Madinah";

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

type HotelHistory = Record<HotelCity, HotelApiItem[]>;

const emptyHotelHistory: HotelHistory = {
  Makkah: [],
  Madinah: [],
};

const hotelInfoActions = [
  { label: "Daftar Hotel NUSUK", target: "hotel-nusuk", icon: Building2 },
  { label: "Daftar Hotel Non-NUSUK", target: "hotel-non-nusuk", icon: FileQuestion },
  { label: "BRN Fee", target: "brn-fee", icon: ReceiptText },
];

const hotelMandiriDescription =
  "Informasi penting yang Bapak/Ibu perlu ketahui sebelum memesan hotel secara mandiri: setiap hotel yang dipesan akan diinput ke dalam sistem aplikasi pemerintah Arab Saudi (NUSUK), lalu diminta approval kepada pihak hotel sebelum visa disetujui. Secara umum ada dua kategori hotel, yaitu hotel yang sudah terdaftar di aplikasi NUSUK dan hotel yang belum terdaftar. Tidak semua hotel yang tampil di aplikasi pemesanan seperti tiket.com, Traveloka, Trip.com, dan sejenisnya sudah masuk dalam NUSUK. Bapak/Ibu masih bisa memesan hotel yang tidak masuk dalam NUSUK, tetapi biasanya provider penerbit visa atau muasasah akan meminta biaya tambahan yang dikenal sebagai BRN Fee. Klik tombol di bawah untuk info lebih lengkap.";

function getCity(value: string | undefined, fallback: HotelCity): HotelCity {
  return value === "Makkah" || value === "Madinah" ? value : fallback;
}

function normalizeHotelData(data: unknown): HotelApiItem[] {
  if (!data || typeof data !== "object") return [];

  const payload = data as { data?: unknown; hotels?: unknown; results?: unknown; rows?: unknown };
  const rows = payload.data ?? payload.hotels ?? payload.results ?? payload.rows ?? [];
  return Array.isArray(rows) ? (rows as HotelApiItem[]) : [];
}

export default function HotelPage() {
  const { draft, setDraft } = useCalculatorDraft();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [city, setCity] = useState<HotelCity>("Madinah");
  const [checkIn, setCheckIn] = useState(draft.journey.departDate || today);
  const [checkOut, setCheckOut] = useState(draft.journey.returnDate || tomorrow);
  const [starFilters, setStarFilters] = useState<string[]>([""]);
  const [band, setBand] = useState("");
  const [results, setResults] = useState<HotelApiItem[]>([]);
  const [hotelHistory, setHotelHistory] = useState<HotelHistory>(emptyHotelHistory);
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
  const historyCount = hotelHistory.Makkah.length + hotelHistory.Madinah.length;

  const getHotelKey = (hotel: HotelApiItem) => `${hotel.id || hotel.nama_hotel || "hotel"}-${getCity(hotel.city, city)}`;

  const mergeHotelHistory = (items: HotelApiItem[]) => {
    if (!items.length) return;

    setHotelHistory((current) => {
      const currentCityItems = current[city] ?? [];
      const byKey = new Map(currentCityItems.map((item) => [getHotelKey(item), item]));

      items.forEach((item) => {
        const normalizedItem = { ...item, city: getCity(item.city, city) };
        byKey.set(getHotelKey(normalizedItem), normalizedItem);
      });

      return {
        ...current,
        [city]: Array.from(byKey.values()).slice(0, 12),
      };
    });
  };

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

      const hotelRows = normalizeHotelData(data);
      setResults(hotelRows);
      mergeHotelHistory(hotelRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke layanan hotel.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const saveHotel = (hotel: HotelApiItem) => {
    const selectedCity = getCity(hotel.city, city);
    const nightlyPrice = Number(hotel.price_idr || 0);

    setDraft((current) => ({
      ...current,
      hotels: [
        ...current.hotels.filter((item) => item.city !== selectedCity),
        {
          city: selectedCity,
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

    setResults((current) => current.filter((item) => getHotelKey(item) !== getHotelKey(hotel)));
    setHotelHistory((current) => ({
      ...current,
      [selectedCity]: current[selectedCity].filter((item) => getHotelKey(item) !== getHotelKey(hotel)),
    }));
  };

  const resetFilters = () => {
    setStarFilters([""]);
    setBand("");
    setResults([]);
  };

  const renderHistoryList = (historyCity: HotelCity) => {
    const items = hotelHistory[historyCity];
    if (!items.length) return null;

    return (
      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">Hotel {historyCity}</p>
        <div className="mt-3 space-y-3">
          {items.map((hotel, index) => {
            const nightlyPrice = Number(hotel.price_idr || 0);
            return (
              <div
                key={`history-${historyCity}-${getHotelKey(hotel)}-${index}`}
                className="rounded-[20px] border border-[rgba(196,170,126,0.16)] bg-white/78 p-4"
              >
                <p className="font-semibold text-[var(--foreground)]">
                  {index + 1}. {hotel.nama_hotel || "Hotel tanpa nama"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
                  Harga: {nightlyPrice ? formatRupiah(nightlyPrice) : hotel.harga_label || "Harga belum tersedia"} | Jarak ke masjid:{" "}
                  {hotel.jarak_label || "Belum tersedia"}
                </p>
                <button
                  type="button"
                  onClick={() => saveHotel({ ...hotel, city: historyCity })}
                  className="post-auth-primary-cta mt-3 h-10 text-sm"
                >
                  <span>Pilih</span>
                  <span aria-hidden>-&gt;</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Pesan Hotel Mandiri"
      description={hotelMandiriDescription}
      actions={hotelInfoActions}
      backHref="/kalkulator"
      backLabel="Kembali ke Kalkulator"
      showCalculatorCart
    >
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_360px]">
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
                      {index === 0 ? (
                        <label className="text-sm font-semibold text-[var(--muted-strong)]">Pilih Kelas Hotel (Bintang)</label>
                      ) : null}
                      <Select
                        className="h-12 whitespace-nowrap py-0 leading-none"
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
                      {hotel.city || city} | {hotel.bintang || "-"} bintang
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

          <MuwahidAssistant
            mode="embedded"
            module="hotel"
            promptKey="hotel_evaluation"
            context={{
              city,
              check_in: checkIn,
              check_out: checkOut,
              nights,
              selected_hotel: activeHotel,
              star_filters: starList,
              radius_to_mosque: band,
            }}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                <Hotel className="h-5 w-5" />
              </span>
              <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Hotel Hasil Pencarian</CardTitle>
            </div>
            {historyCount ? (
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                Berikut riwayat hasil pencarian yang belum dimasukkan ke kalkulator. Klik tombol Pilih pada hotel yang sesuai, lalu hotel
                tersebut akan masuk ke kalkulator dan hilang dari daftar ini agar tidak dobel.
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                  {activeHotel?.hotelName || `Belum pilih hotel ${city}`}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                  Pilih kota Madinah atau Makkah, atur tanggal, kelas hotel, dan radius ke masjid. Setelah klik Cari Hotel, pilih salah
                  satu hotel dari hasil pencarian agar masuk ke kalkulator.
                </p>
              </>
            )}
            {renderHistoryList("Madinah")}
            {renderHistoryList("Makkah")}
          </Card>
        </div>
      </section>
    </ModuleShell>
  );
}
