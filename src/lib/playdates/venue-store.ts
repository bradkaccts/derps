/**
 * Shared venue catalog: hand-checked seed venues plus spots discovered from
 * public map data and cached in the backend. A tiny module-level store so every
 * surface (browser, meetup cards, chat shares) resolves the same ids.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockVenues } from "@/data/mock-venues";
import { buildOverpassQuery, mapOsmElements } from "../../../supabase/functions/discover-venues/osm";
import { type GeoPoint, type Venue, type VenueAmenity, type VenueType } from "./types";

type Row = {
  id: string; name: string; lat: number; lng: number; venue_type: string; amenities: string[];
  leash_rules: string; hours: string; source: string; verification_state: string;
  verified_at: string | null; neighborhood: string; incident_flag_count: number;
};

const remote = new Map<string, Venue>();
let snapshot: Venue[] = [...mockVenues];
const listeners = new Set<() => void>();

export function rowToVenue(r: Row): Venue {
  return {
    id: r.id,
    name: r.name,
    geo: { lat: r.lat, lng: r.lng },
    venueType: r.venue_type as VenueType,
    amenities: (r.amenities ?? []) as VenueAmenity[],
    leashRules: r.leash_rules,
    hours: r.hours,
    source: r.source as Venue["source"],
    verificationState: r.verification_state as Venue["verificationState"],
    verifiedAt: r.verified_at,
    incidentFlagCount: r.incident_flag_count ?? 0,
    neighborhood: r.neighborhood,
  };
}

function addRows(rows: Row[]) {
  let changed = false;
  for (const r of rows) {
    if (!remote.has(r.id)) { remote.set(r.id, rowToVenue(r)); changed = true; }
  }
  if (!changed) return;
  snapshot = [...mockVenues, ...remote.values()];
  listeners.forEach((l) => l());
}

export function findVenue(id: string): Venue | undefined {
  return snapshot.find((v) => v.id === id);
}

export async function discoverVenuesNear(origin: GeoPoint, radiusMiles = 15): Promise<number> {
  const { data, error } = await supabase.functions.invoke("discover-venues", {
    body: { lat: origin.lat, lng: origin.lng, radiusMiles: Math.min(25, Math.max(1, radiusMiles)) },
  });
  if (error) throw error;
  const rows = (data?.venues ?? []) as Row[];
  addRows(rows);
  if (data?.upstreamFailed && rows.length === 0) {
    // The public map service often refuses server traffic; ask it from the
    // browser instead and remember the answer on this device.
    const local = await browserLookup(origin, radiusMiles);
    addRows(local);
    return local.length;
  }
  return rows.length;
}

const LOCAL_KEY = "derps.osm-cells.v1";
const inflight = new Map<string, Promise<Row[]>>();

function readLocal(): Record<string, { at: number; rows: Row[] }> {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}"); } catch { return {}; }
}

async function overpassWithRetry(query: string): Promise<{ elements?: unknown[] }> {
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
  ];
  let last = "";
  for (let i = 0; i < mirrors.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500 * i));
    try {
      const res = await fetch(mirrors[i], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return await res.json();
      last = `status ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`map lookup failed: ${last}`);
}

function browserLookup(origin: GeoPoint, radiusMiles: number): Promise<Row[]> {
  const key = `${(origin.lat).toFixed(2)}:${(origin.lng).toFixed(2)}`;
  const cached = readLocal()[key];
  if (cached && Date.now() - cached.at < 30 * 86_400_000) return Promise.resolve(cached.rows);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const payload = await overpassWithRetry(buildOverpassQuery(origin.lat, origin.lng, radiusMiles * 1609.34));
    const rows: Row[] = mapOsmElements((payload.elements ?? []) as never).map((r) => ({
      ...r, id: `osm:${r.osm_id}`, verified_at: null, incident_flag_count: 0,
    }));
    try {
      const all = readLocal();
      all[key] = { at: Date.now(), rows };
      const keys = Object.keys(all);
      if (keys.length > 40) delete all[keys[0]];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch { /* storage full — fine */ }
    return rows;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function fetchById(id: string) {
  if (findVenue(id) || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const { data } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
  if (data) addRows([data as Row]);
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useVenueCatalog(): Venue[] {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function useVenue(id: string | undefined): Venue | undefined {
  const all = useVenueCatalog();
  useEffect(() => { if (id) void fetchById(id); }, [id]);
  return id ? all.find((v) => v.id === id) : undefined;
}
