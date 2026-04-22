"use client";

import { useEffect, useMemo, useState } from "react";
import { BusFront, Plus, Trash2 } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

type TransportRate = {
  company_name: string;
  route: string;
  homebases: string[];
  car_type: string;
  price_sar: number;
  fee_sar: number;
  price_idr: number;
  fee_idr: number;
  sar_to_idr: number;
  currency: string;
  pic_name?: string;
  whatsapp?: string;
};

type TransportResponse = {
  dropdowns?: {
    companies?: string[];
    routes?: string[];
    car_types?: string[];
    homebases?: string[];
  };
  rates?: TransportRate[];
};

function makeBookingNo() {
  return `TRX-${Date.now().toString().slice(-8)}`;
}

export default function AntarJemputPage() {
  const { draft, setDraft } = useCalculatorDraft();

  const [data, setData] = useState<TransportResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [bookingNo, setBookingNo] = useState(makeBookingNo());
  const [bookingDate] = useState(today);
  const [pickupDate, setPickupDate] = useState(draft.journey.departDate || today);
  const [pickupHour, setPickupHour] = useState("08");
  const [pickupMinute, setPickupMinute] = useState("30");
  const [companyName, setCompanyName] = useState("");
  const [homebase, setHomebase] = useState("");
  const [carType, setCarType] = useState("");
  const [routeLabel, setRouteLabel] = useState("");
  const [passengerCount, setPassengerCount] = useState(String(draft.journey.pax));
  const [baggageCount, setBaggageCount] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerWhatsapp, setPassengerWhatsapp] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/legacy-pricing/transport-rates"))
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setData(payload);

        const firstCompany = payload.dropdowns?.companies?.[0] || "";
        const rates = Array.isArray(payload.rates) ? payload.rates : [];
        const firstCompanyRates = rates.filter((item: TransportRate) => item.company_name === firstCompany);
        const firstHomebase = firstCompanyRates[0]?.homebases?.[0] || "";
        const firstCarType =
          firstCompanyRates.find((item: TransportRate) => !firstHomebase || item.homebases?.includes(firstHomebase))?.car_type || "";
        const firstRoute =
          firstCompanyRates.find(
            (item: TransportRate) =>
              (!firstHomebase || item.homebases?.includes(firstHomebase)) && (!firstCarType || item.car_type === firstCarType)
          )?.route || "";

        setCompanyName(firstCompany);
        setHomebase(firstHomebase);
        setCarType(firstCarType);
        setRouteLabel(firstRoute);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal mengambil data transport legacy.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const companyRates = useMemo(
    () => (data.rates || []).filter((item) => item.company_name === companyName),
    [companyName, data.rates]
  );

  const homebaseOptions = useMemo(() => {
    const values = new Set<string>();
    companyRates.forEach((item) => item.homebases?.forEach((base) => values.add(base)));
    return Array.from(values);
  }, [companyRates]);

  const carOptions = useMemo(() => {
    const values = new Set<string>();
    companyRates
      .filter((item) => !homebase || item.homebases?.includes(homebase))
      .forEach((item) => values.add(item.car_type));
    return Array.from(values);
  }, [companyRates, homebase]);

  const routeOptions = useMemo(() => {
    return companyRates
      .filter((item) => (!homebase || item.homebases?.includes(homebase)) && (!carType || item.car_type === carType))
      .map((item) => item.route);
  }, [carType, companyRates, homebase]);

  const activeRate = useMemo(
    () =>
      companyRates.find(
        (item) =>
          item.route === routeLabel &&
          item.car_type === carType &&
          (!homebase || item.homebases?.includes(homebase))
      ) || null,
    [carType, companyRates, homebase, routeLabel]
  );

  const handleCompanyChange = (nextCompany: string) => {
    const nextCompanyRates = (data.rates || []).filter((item) => item.company_name === nextCompany);
    const nextHomebase = nextCompanyRates[0]?.homebases?.[0] || "";
    const nextCarType =
      nextCompanyRates.find((item) => !nextHomebase || item.homebases?.includes(nextHomebase))?.car_type || "";
    const nextRoute =
      nextCompanyRates.find(
        (item) => (!nextHomebase || item.homebases?.includes(nextHomebase)) && (!nextCarType || item.car_type === nextCarType)
      )?.route || "";

    setCompanyName(nextCompany);
    setHomebase(nextHomebase);
    setCarType(nextCarType);
    setRouteLabel(nextRoute);
  };

  const handleHomebaseChange = (nextHomebase: string) => {
    const nextCarType =
      companyRates.find((item) => item.homebases?.includes(nextHomebase))?.car_type || "";
    const nextRoute =
      companyRates.find((item) => item.homebases?.includes(nextHomebase) && (!nextCarType || item.car_type === nextCarType))?.route || "";

    setHomebase(nextHomebase);
    setCarType(nextCarType);
    setRouteLabel(nextRoute);
  };

  const handleCarTypeChange = (nextCarType: string) => {
    const nextRoute =
      companyRates.find((item) => (!homebase || item.homebases?.includes(homebase)) && item.car_type === nextCarType)?.route || "";
    setCarType(nextCarType);
    setRouteLabel(nextRoute);
  };

  const addRoute = () => {
    if (!activeRate || !routeLabel) return;

    setDraft((current) => ({
      ...current,
      airportTransfers: [
        ...current.airportTransfers,
        {
          bookingDate,
          pickupDate,
          pickupTime: `${pickupHour}:${pickupMinute}`,
          companyName,
          homebase,
          carType,
          routeLabel,
          passengerCount: Math.max(1, Number(passengerCount || 1)),
          baggageCount: Math.max(0, Number(baggageCount || 0)),
          totalPrice: Number(activeRate.price_idr || 0),
          raw: {
            booking_no: bookingNo,
            fee_idr: activeRate.fee_idr,
            fee_sar: activeRate.fee_sar,
            whatsapp: activeRate.whatsapp,
            pic_name: activeRate.pic_name,
          },
        },
      ],
    }));

    setBookingNo(makeBookingNo());
  };

  const removeRoute = (index: number) => {
    setDraft((current) => ({
      ...current,
      airportTransfers: current.airportTransfers.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Booking Transport"
      description="Field utama legacy dipertahankan: kode booking, tanggal booking, tanggal & jam jemput, perusahaan, homebase, jenis mobil, rute, jumlah penumpang, jumlah koper, nama dan WA penumpang."
      backHref="/kalkulator"
      backLabel="Kembali ke Kalkulator"
      showCalculatorCart
    >
      <section className="-mt-14 grid gap-4 sm:-mt-16 lg:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
                <BusFront className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="font-[family-name:var(--font-display)] text-[2rem]">Booking Transport</CardTitle>
                <CardDescription className="mt-1 text-sm leading-7 text-[var(--muted-strong)]">
                  Bapak/Ibu Jamaah, silakan isi detail penjemputan seperti alur legacy.
                </CardDescription>
              </div>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Kode Booking</label>
                <Input readOnly value={bookingNo} className="bg-[rgba(255,255,255,0.65)]" />
                <p className="text-xs text-[var(--muted-strong)]">Kode terbentuk setelah klik Simpan.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Booking</label>
                <Input readOnly value={bookingDate} className="bg-[rgba(255,255,255,0.65)]" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Jemput</label>
                <Input type="date" min={today} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jam Jemput</label>
                <Select value={pickupHour} onChange={(event) => setPickupHour(event.target.value)}>
                  {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">&nbsp;</label>
                <Select value={pickupMinute} onChange={(event) => setPickupMinute(event.target.value)}>
                  {["00", "15", "30", "45"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Perusahaan</label>
                <Select value={companyName} onChange={(event) => handleCompanyChange(event.target.value)} disabled={loading}>
                  <option value="">{loading ? "Memuat perusahaan..." : "Pilih perusahaan"}</option>
                  {(data.dropdowns?.companies || []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Homebase</label>
                <Select value={homebase} onChange={(event) => handleHomebaseChange(event.target.value)} disabled={!companyName}>
                  <option value="">{companyName ? "Pilih homebase" : "Pilih perusahaan dulu"}</option>
                  {homebaseOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jenis Mobil</label>
                <Select value={carType} onChange={(event) => handleCarTypeChange(event.target.value)} disabled={!homebase}>
                  <option value="">{homebase ? "Pilih jenis mobil" : "Pilih homebase dulu"}</option>
                  {carOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-semibold text-[var(--muted-strong)]">Rute</label>
              <Select value={routeLabel} onChange={(event) => setRouteLabel(event.target.value)} disabled={!carType}>
                <option value="">{carType ? "Pilih rute" : "Pilih jenis mobil dulu"}</option>
                {routeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            {activeRate ? (
              <div className="mt-4 rounded-[20px] border border-[rgba(196,170,126,0.16)] bg-[rgba(255,248,236,0.74)] p-4 text-sm text-[var(--muted-strong)]">
                <p className="font-semibold text-[var(--foreground)]">
                  Harga: {formatRupiah(activeRate.price_idr)} <span className="font-normal">({activeRate.price_sar} SAR)</span>
                </p>
                <p className="mt-1">Fee: {formatRupiah(activeRate.fee_idr)}</p>
                <p className="mt-1">PIC: {activeRate.pic_name || "-"}</p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jumlah Penumpang</label>
                <Input value={passengerCount} onChange={(event) => setPassengerCount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jumlah Koper (Total)</label>
                <Input value={baggageCount} onChange={(event) => setBaggageCount(event.target.value)} placeholder="Contoh: 4" />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" className="w-full" type="button" onClick={addRoute} disabled={!activeRate}>
                  <Plus className="h-4 w-4" />
                  Pilih Rute Lainnya
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Nama Penumpang</label>
                <Input value={passengerName} onChange={(event) => setPassengerName(event.target.value)} placeholder="Nama Jamaah" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">WA Penumpang</label>
                <Input value={passengerWhatsapp} onChange={(event) => setPassengerWhatsapp(event.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div className="mt-5">
              <Button variant="secondary" onClick={addRoute} disabled={!activeRate}>
                Simpan
              </Button>
            </div>
          </Card>

          <Card className="rounded-[24px] p-5">
            <CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Rute tambahan yang sudah ditambahkan</CardTitle>
            <div className="mt-4 space-y-3">
              {draft.airportTransfers.length ? (
                draft.airportTransfers.map((item, index) => (
                  <div key={`${item.routeLabel}-${index}`} className="flex items-start justify-between gap-3 rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.routeLabel}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">
                        {item.pickupDate} • {item.pickupTime} • {item.companyName} • {item.carType}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatRupiah(item.totalPrice)}</p>
                    </div>
                    <button type="button" onClick={() => removeRoute(index)} className="rounded-full bg-red-50 p-2 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <CardDescription className="text-sm leading-7 text-[var(--muted-strong)]">
                  Belum ada rute yang disimpan. Tambahkan satu atau beberapa rute untuk masuk ke kalkulator.
                </CardDescription>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Transport aktif</p>
            <CardTitle className="mt-3 font-[family-name:var(--font-display)] text-[1.8rem]">Ringkasan rute</CardTitle>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
              {draft.airportTransfers.length
                ? `${draft.airportTransfers.length} rute tersimpan dengan total ${formatRupiah(
                    draft.airportTransfers.reduce((sum, item) => sum + item.totalPrice, 0)
                  )}.`
                : "Belum ada rute transport yang tersimpan."}
            </p>
          </Card>
        </div>
      </section>
    </ModuleShell>
  );
}
