import { apiBaseUrl } from "@/lib/config";

const defaultWilayahBase = `${apiBaseUrl}/master-wilayah/v1`;

export const wilayahApiBaseUrl =
  process.env.NEXT_PUBLIC_WILAYAH_API_BASE?.replace(/\/$/, "") || defaultWilayahBase;

type WilayahItem = {
  id: string;
  name: string;
};

type WilayahResponse = {
  data?: WilayahItem[];
};

async function fetchWilayah(path: string) {
  const res = await fetch(`${wilayahApiBaseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Gagal memuat data wilayah.");
  }

  const json = (await res.json()) as WilayahResponse;
  return json.data || [];
}

export function getProvinces() {
  return fetchWilayah("/provinces");
}

export function getRegencies(provinceId: string) {
  return fetchWilayah(`/regencies?province_id=${encodeURIComponent(provinceId)}`);
}

export function getDistricts(regencyId: string) {
  return fetchWilayah(`/districts?regency_id=${encodeURIComponent(regencyId)}`);
}

export function getVillages(districtId: string) {
  return fetchWilayah(`/villages?district_id=${encodeURIComponent(districtId)}`);
}
