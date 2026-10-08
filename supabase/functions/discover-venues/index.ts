import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { buildOverpassQuery, cellKey, isCellFresh, mapOsmElements } from "./osm.ts";

const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMiles: z.number().min(1).max(25).default(10),
});

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

async function queryOverpass(query: string): Promise<{ elements?: unknown[] } | null> {
  for (const url of OVERPASS_MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetch(`${url}?data=${encodeURIComponent(query)}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "DerpsVenueDiscovery/1.0 (+https://derps.bradkerr.work)",
          Referer: "https://derps.bradkerr.work",
        },
        signal: ctrl.signal,
      });
      if (res.ok) return await res.json();
      console.error("overpass status", url, res.status);
    } catch (e) {
      console.error("overpass failed", url, e instanceof Error ? e.message : e);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
// Simple per-instance rate limit.
const hits = new Map<string, number[]>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { lat, lng, radiusMiles } = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
    const limited = recent.length >= 10;
    recent.push(now);
    hits.set(ip, recent);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const key = cellKey(lat, lng);
    const { data: cell } = await admin
      .from("venue_discovery_cells").select("fetched_at").eq("cell_key", key).maybeSingle();

    let discovered = 0;
    let upstreamFailed = false;
    if (!limited && !isCellFresh(cell?.fetched_at)) {
      const payload = await queryOverpass(buildOverpassQuery(lat, lng, radiusMiles * 1609.34));
      if (!payload) upstreamFailed = true;
      if (payload) {
        const rows = mapOsmElements((payload.elements ?? []) as never);
        if (rows.length > 0) {
          const { error } = await admin.from("venues").upsert(rows, { onConflict: "osm_id", ignoreDuplicates: true });
          if (error) console.error("upsert failed", error.message);
        }
        discovered = rows.length;
        await admin.from("venue_discovery_cells").upsert({
          cell_key: key, fetched_at: new Date().toISOString(), venue_count: rows.length,
        });
      }
    }

    const dLat = radiusMiles / 69;
    const dLng = radiusMiles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    const { data: venues, error } = await admin
      .from("venues").select("*")
      .in("verification_state", ["verified", "discovered"])
      .gte("lat", lat - dLat).lte("lat", lat + dLat)
      .gte("lng", lng - dLng).lte("lng", lng + dLng)
      .limit(300);
    if (error) return json({ error: error.message }, 500);
    return json({ venues: venues ?? [], discovered, limited, upstreamFailed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
