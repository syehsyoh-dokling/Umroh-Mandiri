"use client";

import { useSyncExternalStore } from "react";

type StoredAuthUser = {
  nama?: string;
  email?: string;
  wa?: string;
  prov_id?: string | null;
  city_id?: string | null;
  dis_id?: string | null;
  desa_id?: string | null;
  region?: unknown;
};

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return localStorage.getItem("auth_user") || "";
}

function getServerSnapshot() {
  return "";
}

export function useStoredAuthUser<T extends StoredAuthUser = StoredAuthUser>() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
