export const featureRouteMap: Record<string, string> = {
  "kalkulator-umroh": "/kalkulator",
  "bandingkan-harga": "/kalkulator",
  persiapan: "/kalkulator",
  tiket: "/tiket",
  hotel: "/hotel",
  visa: "/visa",
  antarjemput: "/antar-jemput",
  muthawif: "/muthawif",
};

export function getFeatureRoute(feature?: string | null, fallback = "/menu") {
  if (!feature) return fallback;
  return featureRouteMap[feature] || fallback;
}

