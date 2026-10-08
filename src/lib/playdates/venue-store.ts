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
    // The public map service sometimes refuses server traffic; ask it from the
    // browser instead. These spots aren't cached for other visitors.
    const query = buildOverpassQuery(origin.lat, origin.lng, radiusMiles * 1609.34);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error(`map lookup ${res.status}`);
    const payload = await res.json();
    const local = mapOsmElements(payload.elements ?? []).map((r) => ({
      ...r, id: `osm:${r.osm_id}`, verified_at: null, incident_flag_count: 0,
    }));
    addRows(local);
    return local.length;
  }
  return rows.length;
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
