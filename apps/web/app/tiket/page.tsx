"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { PlaneTakeoff, Ticket } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { extractAirportCode, formatRupiah, kotaBandara } from "@/lib/travel-pricing";

type TicketRecord = {
  origin?: string;
  orig?: string;
  destination?: string;
  dest?: string;
  tgl_berangkat?: string;
  tanggal?: string;
  harga_total?: number;
  price_idr?: number;
  idr_price?: number;
  airline_summary?: string;
  detail_berangkat?: string;
  segments?: Array<{ dep_airport?: string; arr_airport?: string; dep_time?: string; arr_time?: string; airline_iata?: string; flight_number?: string }>;
};

type TicketBucketSet = {
  direct: TicketRecord[];
  onestop: TicketRecord[];
  twostop: TicketRecord[];
  meta?: Record<string, string>;
};

type CheapestMonthlyResponse = {
  outbound?: { direct?: TicketRecord[]; one_stop?: TicketRecord[]; two_stop?: TicketRecord[] };
  inbound?: { direct?: TicketRecord[]; one_stop?: TicketRecord[]; two_stop?: TicketRecord[] };
};

type PendingSelection = {
  record: TicketRecord;
  bucket: "direct" | "onestop" | "twostop";
  id: string;
};

function emptyBuckets(): TicketBucketSet {
  return { direct: [], onestop: [], twostop: [], meta: {} };
}

function normalizeBuckets(payload: unknown): TicketBucketSet {
  if (!payload || typeof payload !== "object") return emptyBuckets();
  const source = payload as Record<string, unknown>;
  return {
    direct: Array.isArray(source.direct) ? (source.direct as TicketRecord[]) : [],
    onestop: Array.isArray(source.onestop) ? (source.onestop as TicketRecord[]) : Array.isArray(source.one_stop) ? (source.one_stop as TicketRecord[]) : [],
    twostop: Array.isArray(source.twostop) ? (source.twostop as TicketRecord[]) : Array.isArray(source.two_stop) ? (source.two_stop as TicketRecord[]) : [],
    meta: {},
  };
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function monthsBetween(start: Date, end: Date) {
  const keys = new Set<string>();
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= limit) {
    keys.add(monthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  return Array.from(keys);
}

function toDateOnly(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function departDateOf(record: TicketRecord) {
  return toDateOnly(record.tgl_berangkat || record.tanggal);
}

function ticketAmount(record: TicketRecord) {
  return Number(record.idr_price || record.price_idr || record.harga_total || 0);
}

function filterByRange(items: TicketRecord[], start: Date, end: Date) {
  return items.filter((record) => {
    const date = departDateOf(record);
    return Boolean(date && date >= start && date <= end);
  });
}

function collectSegmentsText(record: TicketRecord) {
  if (!Array.isArray(record.segments) || !record.segments.length) return "";
  return record.segments
    .map((segment) => {
      const flight = `${segment.airline_iata || ""}${segment.flight_number || ""}`.trim();
      return `${segment.dep_airport || "?"} -> ${segment.arr_airport || "?"}${flight ? ` (${flight})` : ""}`;
    })
    .join(" | ");
}

function collectLegacyDetailText(record: TicketRecord) {
  if (!record.detail_berangkat) return "";
  try {
    const parsed = JSON.parse(record.detail_berangkat) as { summary?: string; via?: string[]; segments?: Array<{ dep_airport?: string; arr_airport?: string; airline_iata?: string }> };
    if (Array.isArray(parsed.segments) && parsed.segments.length) {
      return parsed.segments.map((segment) => `${segment.dep_airport || "?"} -> ${segment.arr_airport || "?"}${segment.airline_iata ? ` (${segment.airline_iata})` : ""}`).join(" | ");
    }
    if (Array.isArray(parsed.via) && parsed.via.length) return `Transit via ${parsed.via.join(" | ")}`;
    return parsed.summary || "";
  } catch {
    return record.detail_berangkat;
  }
}

function recordKey(record: TicketRecord) {
  return [
    record.origin || record.orig || "",
    record.destination || record.dest || "",
    record.tgl_berangkat || record.tanggal || "",
    ticketAmount(record),
    record.airline_summary || "",
    collectSegmentsText(record) || collectLegacyDetailText(record),
  ].join("|");
}

function dedupeRecords(records: TicketRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = recordKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortedCheapest(records: TicketRecord[], count = 6) {
  return dedupeRecords(records).sort((left, right) => ticketAmount(left) - ticketAmount(right)).slice(0, count);
}

function pickDefaultBucket(data: TicketBucketSet) {
  const buckets: Array<"direct" | "onestop" | "twostop"> = ["direct", "onestop", "twostop"];
  const ranked = buckets
    .map((bucket) => ({ bucket, amount: sortedCheapest(data[bucket], 1)[0] ? ticketAmount(sortedCheapest(data[bucket], 1)[0]) : null }))
    .filter((item) => item.amount !== null)
    .sort((left, right) => Number(left.amount) - Number(right.amount));
  return ranked[0]?.bucket ?? "direct";
}

function routeLabel(record: TicketRecord, leg: "go" | "back", draftOrigin: string, draftDestination: string) {
  const from = String(record.origin || record.orig || (leg === "go" ? extractAirportCode(draftOrigin) : draftDestination)).toUpperCase();
  const to = String(record.destination || record.dest || (leg === "go" ? draftDestination : extractAirportCode(draftOrigin))).toUpperCase();
  return `${from} -> ${to}`;
}

const saudiAirportLabels: Record<string, string> = {
  JED: "Jeddah (JED)",
  MED: "Madinah (MED)",
  SIN: "Singapore (SIN)",
  KUL: "Kuala Lumpur (KUL)",
};

const airportLabelMap = kotaBandara.reduce<Record<string, string>>((acc, item) => {
  const code = extractAirportCode(item).toUpperCase();
  acc[code] = item;
  return acc;
}, { ...saudiAirportLabels });

function airportLabel(code?: string) {
  const normalized = String(code || "").toUpperCase();
  return airportLabelMap[normalized] || (normalized ? `${normalized} (${normalized})` : "-");
}

function recordOrigin(record: TicketRecord, leg: "go" | "back", draftOrigin: string, draftDestination: string) {
  return String(record.origin || record.orig || (leg === "go" ? extractAirportCode(draftOrigin) : draftDestination)).toUpperCase();
}

function recordDestination(record: TicketRecord, leg: "go" | "back", draftOrigin: string, draftDestination: string) {
  return String(record.destination || record.dest || (leg === "go" ? draftDestination : extractAirportCode(draftOrigin))).toUpperCase();
}

function routeFullLabel(record: TicketRecord, leg: "go" | "back", draftOrigin: string, draftDestination: string) {
  return `${airportLabel(recordOrigin(record, leg, draftOrigin, draftDestination))} - ${airportLabel(recordDestination(record, leg, draftOrigin, draftDestination))}`;
}

function weekdayLabel(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeLabel(value?: string) {
  if (!value) return "";
  const normalized = String(value);
  const match = normalized.match(/(\d{2}:\d{2})/);
  return match?.[1] || normalized.slice(0, 5);
}

function airlineNames(record: TicketRecord) {
  const names = new Set<string>();
  if (record.airline_summary) {
    record.airline_summary
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => names.add(item));
  }
  (record.segments || []).forEach((segment) => {
    const label = [segment.airline_iata, segment.flight_number].filter(Boolean).join(" ").trim();
    if (label) names.add(label);
  });
  return Array.from(names);
}

function segmentTimeSummary(record: TicketRecord) {
  const times = (record.segments || []).map((segment) => timeLabel(segment.dep_time)).filter(Boolean);
  return Array.from(new Set(times));
}

export default function TiketPage() {
  const { draft, setDraft } = useCalculatorDraft();
  const [mode, setMode] = useState<"murah" | "tanggal">("murah");
  const [leg, setLeg] = useState<"go" | "back">("go");
  const [bucket, setBucket] = useState<"direct" | "onestop" | "twostop">("direct");
  const [goData, setGoData] = useState<TicketBucketSet>(emptyBuckets());
  const [backData, setBackData] = useState<TicketBucketSet>(emptyBuckets());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<{ go: string; back: string }>({ go: "", back: "" });
  const [recommendation, setRecommendation] = useState("");
  const [prompt, setPrompt] = useState<"back" | "calculator" | null>(null);
  const [pendingGo, setPendingGo] = useState<PendingSelection | null>(null);
  const [pendingBack, setPendingBack] = useState<PendingSelection | null>(null);
  const [returnMinDate, setReturnMinDate] = useState("");
  const [liveMessage, setLiveMessage] = useState("");

  const draftJourney = draft.journey;
  const currentData = leg === "go" ? goData : backData;
  const originCode = extractAirportCode(draftJourney.origin).toUpperCase();
  const destinationCode = String(draftJourney.destination || "JED").toUpperCase();
  const visibleBuckets = useMemo(() => {
    const prepare = (items: TicketRecord[]) =>
      dedupeRecords(items.filter((record) => {
        const from = recordOrigin(record, leg, draftJourney.origin, destinationCode);
        const to = recordDestination(record, leg, draftJourney.origin, destinationCode);
        if (leg === "go") return from === originCode && to === destinationCode;
        return from === destinationCode && to === originCode;
      })).sort((left, right) => {
        const priceGap = ticketAmount(left) - ticketAmount(right);
        if (priceGap !== 0) return priceGap;
        return String(left.tgl_berangkat || left.tanggal || "").localeCompare(String(right.tgl_berangkat || right.tanggal || ""));
      });

    return {
      direct: prepare(currentData.direct ?? []),
      onestop: prepare(currentData.onestop ?? []),
      twostop: prepare(currentData.twostop ?? []),
    };
  }, [currentData, leg, draftJourney.origin, destinationCode, originCode]);
  const currentItems = useMemo(() => (mode === "murah" ? visibleBuckets[bucket].slice(0, 6) : visibleBuckets[bucket]), [bucket, mode, visibleBuckets]);
  const currentMeta = leg === "go" ? goData.meta : backData.meta;
  const selectedFlights = useMemo(() => {
    const go = draft.flights.find((item) => item.raw?.leg === "go");
    const back = draft.flights.find((item) => item.raw?.leg === "back");
    return { go, back };
  }, [draft.flights]);
  const stagedTotal = useMemo(() => (pendingGo ? ticketAmount(pendingGo.record) : 0) + (pendingBack ? ticketAmount(pendingBack.record) : 0), [pendingBack, pendingGo]);

  useEffect(() => {
    try {
      const authUser = JSON.parse(window.localStorage.getItem("auth_user") || "null");
      const authMeta = JSON.parse(window.localStorage.getItem("auth_meta") || "null");
      const params = new URLSearchParams(window.location.search);
      void fetch(apiUrl("/ticket-pricing/v1/activity"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: authUser?.id,
          activity: "visit:tiket",
          sid: authMeta?.sid,
          ip: authMeta?.ip,
          lokasi: authMeta?.location,
          feature: params.get("feature") || "tiket",
          page_code: params.get("page_code") || "",
          origin: extractAirportCode(draftJourney.origin),
          destination: draftJourney.destination,
        }),
      });
    } catch {}
  }, [draftJourney.destination, draftJourney.origin]);

  useEffect(() => {
    const nextBucket = pickDefaultBucket({ ...visibleBuckets, meta: currentData.meta });
    if (!visibleBuckets[bucket]?.length && nextBucket !== bucket) setBucket(nextBucket);
  }, [bucket, currentData.meta, visibleBuckets]);
  const buildCheapRange = async (originCode: string, start: Date, end: Date) => {
    const months = monthsBetween(start, end);
    const settled = await Promise.allSettled(
      months.map((ym) =>
        fetch(apiUrl(`/ticket-pricing/v1/cheapest?origin=${encodeURIComponent(originCode)}&ym=${encodeURIComponent(ym)}&limit=120`)).then((res) =>
          res.json() as Promise<CheapestMonthlyResponse>
        )
      )
    );
    const outbound = emptyBuckets();
    const inbound = emptyBuckets();
    settled.forEach((item) => {
      if (item.status !== "fulfilled") return;
      const payload = item.value || {};
      const outData = normalizeBuckets(payload.outbound);
      const inData = normalizeBuckets(payload.inbound);
      outbound.direct.push(...outData.direct);
      outbound.onestop.push(...outData.onestop);
      outbound.twostop.push(...outData.twostop);
      inbound.direct.push(...inData.direct);
      inbound.onestop.push(...inData.onestop);
      inbound.twostop.push(...inData.twostop);
    });
    return {
      outbound: { direct: filterByRange(outbound.direct, start, end), onestop: filterByRange(outbound.onestop, start, end), twostop: filterByRange(outbound.twostop, start, end) },
      inbound: { direct: filterByRange(inbound.direct, start, end), onestop: filterByRange(inbound.onestop, start, end), twostop: filterByRange(inbound.twostop, start, end) },
    };
  };

  const resetStaged = () => {
    setPendingGo(null);
    setPendingBack(null);
    setSelectedIds({ go: "", back: "" });
    setPrompt(null);
    setLeg("go");
    setReturnMinDate("");
  };

  const searchCheapTickets = async () => {
    const originCode = extractAirportCode(draftJourney.origin);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);
    const range = await buildCheapRange(originCode, start, end);
    setGoData({ ...range.outbound, meta: { origin: originCode, destination: "JED/MED", date_from: dateISO(start), date_to: dateISO(end) } });
    setBackData({ ...range.inbound, meta: { origin: "JED/MED", destination: originCode, date_from: dateISO(start), date_to: dateISO(end) } });
    setLeg("go");
    setBucket(pickDefaultBucket(range.outbound));
    setPrompt(null);
    resetStaged();
  };

  const searchByDate = async () => {
    const originCode = extractAirportCode(draftJourney.origin);
    const destinationCode = draftJourney.destination || "JED";
    const date = draftJourney.departDate;
    if (!date) throw new Error("Mohon pilih tanggal pergi.");
    setLiveMessage("Sedang mencoba provider live: provider 1 -> provider 2 -> fallback DB lokal.");
    const response = await fetch(apiUrl(`/ticket-pricing/v1/by-date?origin=${encodeURIComponent(originCode)}&destination=${encodeURIComponent(destinationCode)}&date=${encodeURIComponent(date)}&refresh_live=1`));
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.detail || payload.error || "Gagal mengambil tiket berdasarkan tanggal.");
    const outbound = normalizeBuckets({ direct: payload.direct, onestop: payload.onestop, twostop: payload.twostop });
    let inbound = emptyBuckets();
    if (draftJourney.returnDate) {
      const backOrigin = destinationCode;
      const backResponse = await fetch(apiUrl(`/ticket-pricing/v1/by-date?origin=${encodeURIComponent(backOrigin)}&destination=${encodeURIComponent(originCode)}&date=${encodeURIComponent(draftJourney.returnDate)}&refresh_live=1`));
      const backPayload = await backResponse.json();
      if (backResponse.ok && backPayload.ok !== false) inbound = normalizeBuckets({ direct: backPayload.direct, onestop: backPayload.onestop, twostop: backPayload.twostop });
      inbound.meta = { origin: backOrigin, destination: originCode, date: draftJourney.returnDate };
    }
    outbound.meta = { origin: originCode, destination: destinationCode, date };
    setGoData(outbound);
    setBackData(inbound);
    setLeg("go");
    setBucket(pickDefaultBucket(outbound));
    setPrompt(null);
    resetStaged();

    const recommendationResponse = await fetch(apiUrl(`/ticket-pricing/v1/recommendation?origin=${encodeURIComponent(originCode)}&destination=${encodeURIComponent(destinationCode)}&date=${encodeURIComponent(date)}`));
    const recommendationPayload = await recommendationResponse.json();
    if (recommendationResponse.ok && recommendationPayload.ok) setRecommendation(recommendationPayload.summary || "");
  };

  const runSearch = async () => {
    setLoading(true);
    setError("");
    setRecommendation("");
    setLiveMessage(mode === "tanggal" ? "Sedang memanggil provider live tiket. Mohon tunggu..." : "");
    try {
      if (mode === "murah") await searchCheapTickets();
      else await searchByDate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke layanan tiket.");
      setGoData(emptyBuckets());
      setBackData(emptyBuckets());
    } finally {
      setLoading(false);
      if (mode !== "tanggal") setLiveMessage("");
    }
  };

  const autoLoadCheap = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      await searchCheapTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat memuat tiket termurah.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (mode !== "murah" || loading) return;
    if (goData.direct.length || goData.onestop.length || goData.twostop.length || backData.direct.length || backData.onestop.length || backData.twostop.length) return;
    void autoLoadCheap();
  }, [mode, loading, goData, backData]);

  const continueToBackTab = async () => {
    if (!pendingGo) return;
    const outboundDate = departDateOf(pendingGo.record);
    if (!outboundDate) return;
    const minDate = new Date(outboundDate);
    minDate.setDate(minDate.getDate() + 7);
    const minDateIso = dateISO(minDate);
    setReturnMinDate(minDateIso);
    setPrompt(null);

    if (mode === "murah") {
      const originCode = extractAirportCode(draftJourney.origin);
      const end = new Date(minDate);
      end.setDate(end.getDate() + 90);
      const range = await buildCheapRange(originCode, minDate, end);
      const inbound = { ...range.inbound, meta: { origin: "JED/MED", destination: originCode, date_from: minDateIso, date_to: dateISO(end) } };
      setBackData(inbound);
      setLeg("back");
      setBucket(pickDefaultBucket(inbound));
      return;
    }

    const backOrigin = draftJourney.destination || "JED";
    const originCode = extractAirportCode(draftJourney.origin);
    setDraft((current) => ({ ...current, journey: { ...current.journey, returnDate: minDateIso } }));
    const response = await fetch(apiUrl(`/ticket-pricing/v1/by-date?origin=${encodeURIComponent(backOrigin)}&destination=${encodeURIComponent(originCode)}&date=${encodeURIComponent(minDateIso)}`));
    const payload = await response.json();
    if (response.ok && payload.ok !== false) {
      const inbound = normalizeBuckets({ direct: payload.direct, onestop: payload.onestop, twostop: payload.twostop });
      inbound.meta = { origin: backOrigin, destination: originCode, date: minDateIso };
      setBackData(inbound);
      setLeg("back");
      setBucket(pickDefaultBucket(inbound));
    }
  };

  const saveTicket = (record: TicketRecord, currentLeg: "go" | "back", currentBucket: "direct" | "onestop" | "twostop", selectionId: string) => {
    if (currentLeg === "go") {
      setPendingGo({ record, bucket: currentBucket, id: selectionId });
      setPendingBack(null);
      setSelectedIds({ go: selectionId, back: "" });
      setPrompt("back");
      return;
    }
    setPendingBack({ record, bucket: currentBucket, id: selectionId });
    setSelectedIds((current) => ({ ...current, back: selectionId }));
    setPrompt("calculator");
  };

  const commitTickets = () => {
    if (!pendingGo || !pendingBack) return;
    setDraft((current) => {
      const buildFlight = (selection: PendingSelection, currentLeg: "go" | "back") => ({
        origin: currentLeg === "go" ? current.journey.origin : `${current.journey.destination} (${current.journey.destination})`,
        destination: currentLeg === "go" ? current.journey.destination : extractAirportCode(current.journey.origin),
        departDate: selection.record.tgl_berangkat || selection.record.tanggal || "",
        returnDate: current.journey.returnDate,
        pax: current.journey.pax,
        ticketType: mode,
        label: `${currentLeg === "go" ? "Tiket Pergi" : "Tiket Pulang"} ${routeLabel(selection.record, currentLeg, current.journey.origin, current.journey.destination)} | ${selection.record.tgl_berangkat || selection.record.tanggal || ""}`,
        airlineSummary: selection.record.airline_summary,
        bucket: (selection.bucket === "direct" ? "direct" : selection.bucket === "onestop" ? "1stop" : "2stop") as "direct" | "1stop" | "2stop",
        totalPrice: ticketAmount(selection.record),
        raw: { ...(selection.record as Record<string, unknown>), leg: currentLeg },
      });
      return { ...current, flights: [...current.flights.filter((item) => item.raw?.leg !== "go" && item.raw?.leg !== "back"), buildFlight(pendingGo, "go"), buildFlight(pendingBack, "back")] };
    });
    setPrompt(null);
  };

  const renderRecords = (records: TicketRecord[]) => {
    if (!records.length) return <div className="rounded-[18px] border border-dashed border-[rgba(196,170,126,0.28)] bg-white/72 px-4 py-4 text-sm text-[var(--muted-strong)]">Belum ada data di kategori ini.</div>;
    return records.map((record, index) => {
      const amount = ticketAmount(record);
      const detail = collectSegmentsText(record) || collectLegacyDetailText(record);
      const airlines = airlineNames(record);
      const times = segmentTimeSummary(record);
      const id = `${leg}-${bucket}-${index}-${record.tgl_berangkat || record.tanggal || ""}-${amount}`;
      return (
        <div key={id} className={`rounded-[20px] border p-4 transition ${selectedIds[leg] === id ? "border-[rgba(223,160,58,0.38)] bg-[rgba(255,244,226,0.84)]" : "border-[rgba(196,170,126,0.16)] bg-white/82"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full bg-[rgba(223,160,58,0.16)] px-3 py-1 text-xs font-bold tracking-[0.08em] text-[var(--primary)]">
                {leg === "go" ? "Berangkat" : "Pulang"} • {weekdayLabel(record.tgl_berangkat || record.tanggal || "-")}
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{routeFullLabel(record, leg, draftJourney.origin, draftJourney.destination)}</p>
            </div>
            <span className="rounded-full bg-[rgba(214,177,110,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">{bucket === "direct" ? "Direct" : bucket === "onestop" ? "1x Transit" : "2x Transit"}</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-[16px] bg-[rgba(255,248,236,0.82)] px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Maskapai</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{airlines.length ? airlines.join(" / ") : record.airline_summary || "Maskapai belum tersedia"}</p>
            </div>
            <div className="rounded-[16px] bg-[rgba(255,248,236,0.82)] px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Jam Berangkat</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{times.length ? times.join(" • ") : "Jam belum tersedia"}</p>
            </div>
          </div>
          {detail ? <p className="mt-2 text-sm text-[var(--muted-strong)]">{detail}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-black text-[var(--foreground)]">Estimasi Harga: {formatRupiah(amount)}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-strong)]">{mode === "murah" ? "Mode Trend 90 Hari" : "Mode Tanggal Spesifik"}</p>
          </div>
          <Button variant="secondary" className="mt-4 h-10 px-4 text-sm" onClick={() => saveTicket(record, leg, bucket, id)}>{leg === "go" ? "Pilih Tiket Pergi" : "Pilih Tiket Pulang"}</Button>
        </div>
      );
    });
  };
  return (
    <ModuleShell eyebrow="Komponen Kalkulator" title="Cari Tiket Umroh" description="Pilih tiket termurah untuk keberangkatan dan kepulangan, lalu lanjutkan ke kalkulator." backHref="/kalkulator" backLabel="Kembali ke Kalkulator" showCalculatorCart>
      <section className="-mt-14 grid gap-4 sm:-mt-16 lg:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="text-center">
              <CardTitle className="font-[family-name:var(--font-display)] text-[2.1rem]">Cari Tiket Umroh</CardTitle>
              <CardDescription className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">Mode murah menampilkan opsi termurah 90 hari ke depan.</CardDescription>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant={mode === "murah" ? "secondary" : "ghost"} onClick={() => setMode("murah")}>Cari Tiket Murah</Button>
              <Button variant={mode === "tanggal" ? "secondary" : "ghost"} onClick={() => setMode("tanggal")}>Berdasarkan Tanggal</Button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Pilih Bandara (Asal)</label>
                <Select value={draftJourney.origin} onChange={(event) => setDraft((current) => ({ ...current, journey: { ...current.journey, origin: event.target.value } }))}>
                  {kotaBandara.map((kota) => <option key={kota} value={kota}>{kota}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Tujuan</label>
                <Select value={draftJourney.destination} onChange={(event) => setDraft((current) => ({ ...current, journey: { ...current.journey, destination: event.target.value } }))}>
                  <option value="JED">Jeddah</option>
                  <option value="MED">Madinah</option>
                </Select>
              </div>
              {mode === "tanggal" ? <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Pergi</label>
                  <Input className="border-[rgba(223,160,58,0.55)] bg-[rgba(255,248,236,0.82)] font-semibold text-[var(--foreground)]" type="date" value={draftJourney.departDate} onChange={(event) => setDraft((current) => ({ ...current, journey: { ...current.journey, departDate: event.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal Pulang (opsional)</label>
                  <Input className="border-[rgba(223,160,58,0.55)] bg-[rgba(255,248,236,0.82)] font-semibold text-[var(--foreground)]" type="date" min={returnMinDate || undefined} value={draftJourney.returnDate} onChange={(event) => setDraft((current) => ({ ...current, journey: { ...current.journey, returnDate: event.target.value } }))} />
                </div>
              </> : null}
            </div>
            <div className="mt-5 flex justify-center">
              <Button variant="secondary" onClick={runSearch} disabled={loading}>{loading ? "Mencari tiket..." : "Cari Tiket"}</Button>
            </div>
            {loading && mode === "tanggal" ? (
              <div className="mt-4 overflow-hidden rounded-[22px] border border-[rgba(196,170,126,0.18)] bg-[rgba(255,248,236,0.84)] px-4 py-4">
                <div className="relative h-12">
                  <div className="absolute inset-y-0 left-0 right-0 border-b border-dashed border-[rgba(214,177,110,0.35)]" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-[flight-run_2.4s_linear_infinite] text-[var(--primary)]">
                    <PlaneTakeoff className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-2 text-center text-sm font-medium text-[var(--muted-strong)]">{liveMessage || "Sedang mengecek provider live dan menyusun hasil tiket..."}</p>
              </div>
            ) : null}
            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {recommendation ? <div className="mt-4 rounded-2xl border border-[rgba(196,170,126,0.18)] bg-[rgba(255,248,236,0.82)] px-4 py-3 text-sm leading-7 text-[var(--muted-strong)]"><strong className="text-[var(--foreground)]">Rekomendasi internal:</strong> {recommendation}</div> : null}
          </Card>
          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <Button variant={leg === "go" ? "secondary" : "ghost"} onClick={() => setLeg("go")} disabled={!goData.direct.length && !goData.onestop.length && !goData.twostop.length}>Keberangkatan</Button>
                <Button variant={leg === "back" ? "secondary" : "ghost"} onClick={() => setLeg("back")} disabled={!backData.direct.length && !backData.onestop.length && !backData.twostop.length}>Kepulangan</Button>
              </div>
                <p className="text-sm text-[var(--muted-strong)]">{leg === "go" ? goData.meta?.date_from && goData.meta?.date_to ? `Range: ${goData.meta.date_from} -> ${goData.meta.date_to}` : goData.meta?.date : backData.meta?.date_from && backData.meta?.date_to ? `Range: ${backData.meta.date_from} -> ${backData.meta.date_to}` : backData.meta?.date || "Belum ada jadwal pulang"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant={bucket === "direct" ? "secondary" : "ghost"} onClick={() => setBucket("direct")} disabled={!visibleBuckets.direct.length}>Direct ({visibleBuckets.direct.length})</Button>
              <Button variant={bucket === "onestop" ? "secondary" : "ghost"} onClick={() => setBucket("onestop")} disabled={!visibleBuckets.onestop.length}>1x Stop ({visibleBuckets.onestop.length})</Button>
              <Button variant={bucket === "twostop" ? "secondary" : "ghost"} onClick={() => setBucket("twostop")} disabled={!visibleBuckets.twostop.length}>2x Stop ({visibleBuckets.twostop.length})</Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Sumber</p><p className="mt-2 text-sm text-[var(--muted-strong)]">{mode === "murah" ? "Trend internal + cache lokal 90 hari" : "Data tanggal internal"}</p></div>
              <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Bucket Aktif</p><p className="mt-2 text-sm text-[var(--muted-strong)]">{bucket === "direct" ? "Direct" : bucket === "onestop" ? "1x Stop" : "2x Stop"}</p></div>
              <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Minimal Pulang</p><p className="mt-2 text-sm text-[var(--muted-strong)]">{returnMinDate || "Belum dihitung"}</p></div>
            </div>
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {mode === "murah"
                    ? leg === "go"
                      ? `6 Harga Termurah Keberangkatan ke ${airportLabel(destinationCode)}`
                      : `6 Harga Termurah Kepulangan dari ${airportLabel(destinationCode)}`
                    : leg === "go"
                      ? `Semua Opsi Keberangkatan ke ${airportLabel(destinationCode)}`
                      : `Semua Opsi Kepulangan dari ${airportLabel(destinationCode)}`}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-strong)]">{bucket === "direct" ? "Kategori Direct" : bucket === "onestop" ? "Kategori 1x Stop" : "Kategori 2x Stop"}</p>
              </div>
              <div className="space-y-3">{renderRecords(currentItems)}</div>
            </div>
          </Card>
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,177,110,0.16)] text-[var(--primary)]"><PlaneTakeoff className="h-5 w-5" /></span><CardTitle className="font-[family-name:var(--font-display)] text-[1.8rem]">Ringkasan Tiket</CardTitle></div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Pergi</p><p className="mt-2 text-sm text-[var(--muted-strong)]">{pendingGo ? `${routeFullLabel(pendingGo.record, "go", draftJourney.origin, draftJourney.destination)} | ${formatRupiah(ticketAmount(pendingGo.record))}` : selectedFlights.go ? `${selectedFlights.go.airlineSummary || "Maskapai campuran"} | ${formatRupiah(selectedFlights.go.totalPrice)}` : "Belum dipilih"}</p></div>
              <div className="rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Pulang</p><p className="mt-2 text-sm text-[var(--muted-strong)]">{pendingBack ? `${routeFullLabel(pendingBack.record, "back", draftJourney.origin, draftJourney.destination)} | ${formatRupiah(ticketAmount(pendingBack.record))}` : selectedFlights.back ? `${selectedFlights.back.airlineSummary || "Maskapai campuran"} | ${formatRupiah(selectedFlights.back.totalPrice)}` : "Belum dipilih"}</p></div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[18px] bg-[rgba(255,248,236,0.8)] px-4 py-4 text-sm text-[var(--muted-strong)]"><Ticket className="h-4 w-4 text-[var(--primary)]" />Pilih tiket pergi dulu, lalu sistem akan menyiapkan tiket pulang minimal 7 hari sesudahnya.</div>
            <div className="mt-4 rounded-[18px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Snapshot Pencarian</p><div className="mt-3 space-y-2 text-sm text-[var(--muted-strong)]"><p>Asal: {draftJourney.origin}</p><p>Tujuan default: {airportLabel(destinationCode)}</p><p>{currentMeta?.date_from && currentMeta?.date_to ? `${currentMeta.date_from} -> ${currentMeta.date_to}` : currentMeta?.date || "Belum ada jadwal"}</p><p>Total tiket sementara: {formatRupiah(stagedTotal)}</p></div></div>
          </Card>
        </div>
      </section>
      {prompt === "back" && pendingGo ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.48)] px-4"><div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><p className="text-xl font-black text-[var(--foreground)]">Mau lanjut lihat tiket pulang?</p><p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">Anda memilih tiket berangkat <strong>{weekdayLabel(pendingGo.record.tgl_berangkat || pendingGo.record.tanggal || "-")}</strong> untuk rute <strong>{routeFullLabel(pendingGo.record, "go", draftJourney.origin, draftJourney.destination)}</strong> dengan harga <strong>{formatRupiah(ticketAmount(pendingGo.record))}</strong>. Jika lanjut, sistem akan menampilkan tiket pulang mulai minimal 7 hari sesudah tanggal ini.</p><div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void continueToBackTab()}>Ya</Button><Button variant="ghost" onClick={resetStaged}>Tidak</Button></div></div></div> : null}
      {prompt === "calculator" && pendingGo && pendingBack ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.48)] px-4"><div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><p className="text-xl font-black text-[var(--foreground)]">Masukkan ke keranjang / kalkulator?</p><div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted-strong)]"><p>Anda memilih berangkat <strong>{weekdayLabel(pendingGo.record.tgl_berangkat || pendingGo.record.tanggal || "-")}</strong> untuk rute <strong>{routeFullLabel(pendingGo.record, "go", draftJourney.origin, draftJourney.destination)}</strong> dengan harga <strong>{formatRupiah(ticketAmount(pendingGo.record))}</strong>.</p><p>Dan kepulangan <strong>{weekdayLabel(pendingBack.record.tgl_berangkat || pendingBack.record.tanggal || "-")}</strong> untuk rute <strong>{routeFullLabel(pendingBack.record, "back", draftJourney.origin, draftJourney.destination)}</strong> dengan harga <strong>{formatRupiah(ticketAmount(pendingBack.record))}</strong>.</p><p className="text-base font-black text-[var(--foreground)]">Total harga tiket: {formatRupiah(stagedTotal)}</p></div><div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => { commitTickets(); window.location.href = "/kalkulator"; }}>Ya</Button><Button variant="ghost" onClick={resetStaged}>Tidak</Button></div></div></div> : null}
      <style jsx global>{`
        @keyframes flight-run {
          0% { transform: translate3d(-10%, -50%, 0); }
          100% { transform: translate3d(calc(100% - 2rem), -50%, 0); }
        }
      `}</style>
    </ModuleShell>
  );
}
