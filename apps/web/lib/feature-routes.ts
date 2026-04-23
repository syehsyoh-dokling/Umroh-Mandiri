export const featureRouteMap: Record<string, string> = {
  "kalkulator-umroh": "/kalkulator",
  "bandingkan-harga": "/kalkulator",
  persiapan: "/kalkulator",
  tiket: "/tiket",
  hotel: "/hotel",
  visa: "/visa",
  antarjemput: "/antar-jemput",
  "antar-jemput": "/antar-jemput",
  handling: "/antar-jemput?feature=handling",
  muthawif: "/muthawif",
  "hotel-nusuk": "/hotel-info/nusuk",
  "hotel-non-nusuk": "/hotel-info/non-nusuk",
  "brn-fee": "/hotel-info/brn-fee",
};

export function getFeatureRoute(feature?: string | null, fallback = "/menu") {
  if (!feature) return fallback;
  return featureRouteMap[feature] || fallback;
}
