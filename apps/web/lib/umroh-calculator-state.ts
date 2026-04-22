"use client";

import { useEffect, useMemo, useState } from "react";

export type FlightSelection = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  pax: number;
  ticketType: "murah" | "tanggal";
  label: string;
  airlineSummary?: string;
  bucket?: "direct" | "1stop" | "2stop";
  totalPrice: number;
  raw?: Record<string, unknown>;
};

export type JourneyConfig = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  pax: number;
  totalNights: number;
  madinahNights: number;
  makkahNights: number;
};

export type HotelSelection = {
  city: "Makkah" | "Madinah";
  hotelName: string;
  stars?: number;
  radiusLabel?: string;
  roomType?: string;
  nights: number;
  nightlyPrice: number;
  totalPrice: number;
  source?: string;
  raw?: Record<string, unknown>;
};

export type VisaSelection = {
  visaType: string;
  description?: string;
  totalPrice: number;
  source?: string;
};

export type AirportTransferSelection = {
  bookingDate?: string;
  pickupDate: string;
  pickupTime: string;
  companyName?: string;
  homebase?: string;
  carType?: string;
  routeLabel: string;
  passengerCount: number;
  baggageCount: number;
  totalPrice: number;
  raw?: Record<string, unknown>;
};

export type MuthawifSelection = {
  name?: string;
  totalPrice: number;
  notes?: string;
};

export type CalculatorDraft = {
  journey: JourneyConfig;
  flights: FlightSelection[];
  hotels: HotelSelection[];
  visa: VisaSelection | null;
  airportTransfers: AirportTransferSelection[];
  muthawif: MuthawifSelection | null;
  updatedAt: string | null;
};

const STORAGE_KEY = "muwahid_calculator_draft";

export const emptyCalculatorDraft: CalculatorDraft = {
  journey: {
    origin: "Jakarta (CGK)",
    destination: "JED",
    departDate: "",
    returnDate: "",
    pax: 1,
    totalNights: 9,
    madinahNights: 2,
    makkahNights: 7,
  },
  flights: [],
  hotels: [],
  visa: null,
  airportTransfers: [],
  muthawif: null,
  updatedAt: null,
};

export type DraftCartItem = {
  id: string;
  type: string;
  label: string;
  description: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

function safeParseDraft(raw: string | null): CalculatorDraft {
  if (!raw) return emptyCalculatorDraft;
  try {
    const parsed = JSON.parse(raw) as Partial<CalculatorDraft>;
    return {
      journey: {
        ...emptyCalculatorDraft.journey,
        ...(parsed.journey ?? {}),
      },
      flights: Array.isArray(parsed.flights) ? parsed.flights : [],
      hotels: Array.isArray(parsed.hotels) ? parsed.hotels : [],
      visa: parsed.visa ?? null,
      airportTransfers: Array.isArray(parsed.airportTransfers) ? parsed.airportTransfers : [],
      muthawif: parsed.muthawif ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return emptyCalculatorDraft;
  }
}

export function readCalculatorDraft(): CalculatorDraft {
  if (typeof window === "undefined") return emptyCalculatorDraft;
  return safeParseDraft(window.localStorage.getItem(STORAGE_KEY));
}

export function writeCalculatorDraft(draft: CalculatorDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    })
  );
}

export function patchCalculatorDraft(
  patch: Partial<CalculatorDraft> | ((current: CalculatorDraft) => CalculatorDraft)
) {
  const current = readCalculatorDraft();
  const next =
    typeof patch === "function"
      ? patch(current)
      : {
          ...current,
          ...patch,
        };
  writeCalculatorDraft(next);
  return next;
}

export function clearCalculatorDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function calculateDraftTotals(draft: CalculatorDraft) {
  const ticketTotal = draft.flights.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const hotelTotal = draft.hotels.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const visaTotal = draft.visa?.totalPrice || 0;
  const transferTotal = draft.airportTransfers.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const muthawifTotal = draft.muthawif?.totalPrice || 0;

  return {
    ticketTotal,
    hotelTotal,
    visaTotal,
    transferTotal,
    muthawifTotal,
    grandTotal: ticketTotal + hotelTotal + visaTotal + transferTotal + muthawifTotal,
  };
}

export function buildDraftCartItems(draft: CalculatorDraft): DraftCartItem[] {
  const ticketItems: DraftCartItem[] = draft.flights.map((item, index) => ({
    id: `ticket-${index}`,
    type: "Tiket",
    label: "Tiket Pesawat",
    description: item.label || item.airlineSummary || `${item.origin} ke ${item.destination}`,
    unitPrice: item.totalPrice || 0,
    quantity: Math.max(1, Number(item.pax || draft.journey.pax || 1)),
    subtotal: item.totalPrice || 0,
  }));

  const hotelItems: DraftCartItem[] = draft.hotels.map((item, index) => ({
    id: `hotel-${index}`,
    type: "Hotel",
    label: `${item.city}`,
    description: `${item.hotelName}${item.roomType ? ` • ${item.roomType}` : ""}${item.nights ? ` • ${item.nights} malam` : ""}`,
    unitPrice: item.nightlyPrice || 0,
    quantity: Math.max(1, Number(item.nights || 1)),
    subtotal: item.totalPrice || 0,
  }));

  const visaItems: DraftCartItem[] = draft.visa
    ? [
        {
          id: "visa",
          type: "Visa",
          label: "Visa",
          description: draft.visa.visaType,
          unitPrice: draft.visa.totalPrice || 0,
          quantity: 1,
          subtotal: draft.visa.totalPrice || 0,
        },
      ]
    : [];

  const transferItems: DraftCartItem[] = draft.airportTransfers.map((item, index) => ({
    id: `transfer-${index}`,
    type: "Transport",
    label: "Jemputan Bandara",
    description: item.routeLabel,
    unitPrice: item.totalPrice || 0,
    quantity: 1,
    subtotal: item.totalPrice || 0,
  }));

  const muthawifItems: DraftCartItem[] = draft.muthawif
    ? [
        {
          id: "muthawif",
          type: "Muthawif",
          label: "Muthawif",
          description: draft.muthawif.name || draft.muthawif.notes || "Pendamping lapangan",
          unitPrice: draft.muthawif.totalPrice || 0,
          quantity: 1,
          subtotal: draft.muthawif.totalPrice || 0,
        },
      ]
    : [];

  return [...ticketItems, ...hotelItems, ...visaItems, ...transferItems, ...muthawifItems];
}

export function useCalculatorDraft() {
  const [draft, setDraft] = useState<CalculatorDraft>(emptyCalculatorDraft);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(readCalculatorDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totals = useMemo(() => calculateDraftTotals(draft), [draft]);

  const updateDraft = (patch: Partial<CalculatorDraft> | ((current: CalculatorDraft) => CalculatorDraft)) => {
    const next = patchCalculatorDraft(patch);
    setDraft(next);
  };

  return {
    draft,
    totals,
    setDraft: updateDraft,
    resetDraft: () => {
      clearCalculatorDraft();
      setDraft(emptyCalculatorDraft);
    },
  };
}
