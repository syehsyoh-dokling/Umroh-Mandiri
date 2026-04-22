const defaultApiBase = "http://127.0.0.1:8000";

function normalizeApiBase(value?: string) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "");

  return cleaned.replace(/\/$/, "");
}

export const apiBaseUrl = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE) || defaultApiBase;

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}
