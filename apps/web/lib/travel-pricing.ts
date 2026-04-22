export const kotaBandara = [
  "Banda Aceh (BTJ)",
  "Balikpapan (BPN)",
  "Bandung (BDO)",
  "Banjarmasin (BDJ)",
  "Batam (BTH)",
  "Bengkulu (BKS)",
  "Denpasar (DPS)",
  "Jakarta (CGK)",
  "Kupang (KOE)",
  "Lombok (LOP)",
  "Makassar (UPG)",
  "Manado (MDC)",
  "Medan (KNO)",
  "Padang (PDG)",
  "Palembang (PLM)",
  "Pekanbaru (PKU)",
  "Pontianak (PNK)",
  "Samarinda (AAP)",
  "Semarang (SRG)",
  "Solo (SOC)",
  "Surabaya (SUB)",
  "Tanjungpinang (TNJ)",
  "Ternate (TTE)",
  "Yogyakarta (YIA)",
];

export const hotelBands = ["<=200m", "201-500m", "501m-1km", "1-2km", ">2km"];

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function extractAirportCode(label: string) {
  const match = label.match(/\(([^)]+)\)/);
  return match?.[1] || label;
}

export function slugifyFeatureCode(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
