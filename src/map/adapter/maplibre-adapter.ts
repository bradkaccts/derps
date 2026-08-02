/**
 * MapLibre GL JS implementation of `MapAdapter` (spec §6).
 *
 * Two deliberate choices worth knowing about:
 *
 * 1. Venue pins and cluster bubbles are DOM markers, not symbol layers. Symbol
 *    layers would need a generated spritesheet and PBF glyph ranges served
 *    same-origin (MAP-508); DOM markers reach the same visual result using the
 *    product's own CSS tokens, and they are focusable and screen-reader
 *    addressable for free (MAP-6xx).
 * 2. Selection is a marker class swap plus `setFeatureState`, never a filter
 *    swap or a source replacement — replacing source data reparses tiles and
 *    visibly stutters.
 */
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  type LngLatLike,
} from "maplibre-gl";
import { buildStyle } from "@/map-style";
import { paletteFor } from "@/map-style/palette";
import { type ThemeName } from "@/design-tokens/tokens";
import {
  NO_PADDING,
  type Camera,
  type CreateAdapterOptions,
  type GeofenceCircle,
  type MapAdapter,
  type MapAdapterEvents,
  type MapVenueFeature,
  type Padding,
} from "./types";

const VENUE_SOURCE = "derps-venues";
const GEOFENCE_SOURCE = "derps-geofence";
const CLUSTER_MAX_ZOOM = 13;
const DEFAULT_MAX_RENDERED = 500;

type Listeners = { [K in keyof MapAdapterEvents]: Set<MapAdapterEvents[K]> };

function circlePolygon(circle: GeofenceCircle, steps = 64) {
  const { center, radiusMeters, label, description } = circle;
  const [lng, lat] = center;
  const latRadius = radiusMeters / 111_320;
  const lngRadius = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * 2 * Math.PI;
    ring.push([lng + lngRadius * Math.cos(theta), lat + latRadius * Math.sin(theta)]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { label: label ?? "", description: description ?? "" },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      },
    ],
  };
}


/** Cheap WebGL probe — the fallback list view renders when this is false. */
export function isWebglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export async function createMapLibreAdapter(
  options: CreateAdapterOptions,
): Promise<MapAdapter> {
  const {
    container,
    variant,
    camera,
    padding = NO_PADDING,
    reducedMotion = false,
    maxRenderedVenues = DEFAULT_MAX_RENDERED,
  } = options;

  const listeners: Listeners = {
    selectVenue: new Set(),
    cameraChange: new Set(),
    error: new Set(),
  };

  const map = new MapLibreMap({
    container,
    style: buildStyle({ variant, center: camera.center, zoom: camera.zoom }) as never,
    center: camera.center,
    zoom: camera.zoom,
    bearing: camera.bearing ?? 0,
    pitch: 0,
    attributionControl: false,
    // §1.3 — no globe, no terrain, no extrusions.
    maxPitch: 0,
    dragRotate: false,
    // MAP-508 — nothing is fetched from a third party.
    transformRequest: (url) => ({ url }),
  });
  map.touchZoomRotate.disableRotation();
  map.easeTo({ padding, duration: 0 });

  let venues: MapVenueFeature[] = [];
  let selectedId: string | null = null;
  let currentVariant: ThemeName = variant;
  let destroyed = false;
  const markers = new Map<string, Marker>();

  const emit = <K extends keyof MapAdapterEvents>(
    event: K,
    ...args: Parameters<MapAdapterEvents[K]>
  ) => {
    for (const handler of listeners[event]) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  };

  await new Promise<void>((resolve) => {
    if (map.loaded()) resolve();
    else map.once("load", () => resolve());
  });
  if (destroyed) {
    map.remove();
    throw new Error("Map destroyed before load completed");
  }

  map.on("error", (event) => {
    emit("error", event.error instanceof Error ? event.error : new Error("Map error"));
  });

  /* ---------------------------------------------------------------- *
   * Sources & layers (§7.1) — runtime data, never baked into the style.
   * ---------------------------------------------------------------- */

  map.addSource(GEOFENCE_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(VENUE_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    promoteId: "id",
  });

  const applyPalette = (theme: ThemeName) => {
    const palette = paletteFor(theme);
    map.setPaintProperty("venue-geofence-fill", "fill-color", palette.geofenceFill);
    map.setPaintProperty("venue-geofence-line", "line-color", palette.geofenceLine);
    container.dataset.derpsMapVariant = theme;
  };

  const palette = paletteFor(variant);

  map.addLayer({
    id: "venue-geofence-fill",
    type: "fill",
    source: GEOFENCE_SOURCE,
    paint: { "fill-color": palette.geofenceFill },
  });
  map.addLayer({
    id: "venue-geofence-line",
    type: "line",
    source: GEOFENCE_SOURCE,
    paint: { "line-color": palette.geofenceLine, "line-width": 2, "line-dasharray": [3, 2] },
  });

  /* ---------------------------------------------------------------- *
   * Markers — clusters and pins, clustered in screen space.
   *
   * Screen-space grouping rather than the source's built-in supercluster:
   * clustering has to agree with what the user can actually see, the pins are
   * DOM anyway, and it keeps marker sync independent of tile parsing.
   * ---------------------------------------------------------------- */

  const makePin = (venue: MapVenueFeature) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "derps-map-pin";
    el.dataset.venueId = venue.id;
    el.setAttribute(
      "aria-label",
      `${venue.name}, ${venue.typeLabel}, ${venue.distanceBand} away`,
    );
    if (!venue.selectable) el.dataset.disabled = "true";
    const glyph = document.createElement("span");
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = venue.glyph;
    el.appendChild(glyph);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      emit("selectVenue", venue.id);
    });
    return el;
  };

  const makeCluster = (count: number, coords: [number, number]) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "derps-map-cluster";
    el.setAttribute("aria-label", `${count} venues here — zoom in`);
    el.textContent = String(count);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      map.easeTo({
        center: coords,
        zoom: Math.min(map.getZoom() + 2, CLUSTER_MAX_ZOOM + 1),
        duration: reducedMotion ? 0 : 400,
      });
    });
    return el;
  };

  const CLUSTER_PX = 56;

  const syncMarkers = () => {
    if (destroyed) return;

    const zoom = map.getZoom();
    const bounds = map.getBounds();
    const visible = venues
      .filter((venue) => bounds.contains([venue.lng, venue.lat]))
      .slice(0, maxRenderedVenues);

    type Group = { venues: MapVenueFeature[]; x: number; y: number };
    const groups: Group[] = [];

    for (const venue of visible) {
      const point = map.project([venue.lng, venue.lat]);
      const near =
        zoom <= CLUSTER_MAX_ZOOM
          ? groups.find((g) => Math.hypot(g.x - point.x, g.y - point.y) < CLUSTER_PX)
          : undefined;
      if (near) near.venues.push(venue);
      else groups.push({ venues: [venue], x: point.x, y: point.y });
    }

    const seen = new Set<string>();

    for (const group of groups) {
      const isCluster = group.venues.length > 1;
      const ids = group.venues.map((v) => v.id);
      const coords: [number, number] = isCluster
        ? [
            ids.reduce((sum, _, i) => sum + group.venues[i].lng, 0) / ids.length,
            ids.reduce((sum, _, i) => sum + group.venues[i].lat, 0) / ids.length,
          ]
        : [group.venues[0].lng, group.venues[0].lat];
      const key = isCluster ? `cluster-${ids.join("|")}` : `venue-${ids[0]}`;
      seen.add(key);

      const existing = markers.get(key);
      if (existing) {
        existing.setLngLat(coords);
        continue;
      }

      const el = isCluster
        ? makeCluster(group.venues.length, coords)
        : makePin(group.venues[0]);
      if (!isCluster && group.venues[0].id === selectedId) el.dataset.selected = "true";
      markers.set(key, new Marker({ element: el }).setLngLat(coords).addTo(map));
    }

    for (const [key, marker] of markers) {
      if (!seen.has(key)) {
        marker.remove();
        markers.delete(key);
      }
    }
  };

  map.on("data", (event) => {
    if ("sourceId" in event && event.sourceId === VENUE_SOURCE) syncMarkers();
  });
  map.on("idle", syncMarkers);
  map.on("move", syncMarkers);
  map.on("moveend", () => {
    syncMarkers();
    emit("cameraChange", readCamera());
  });
  map.on("click", () => emit("selectVenue", null));

  const readCamera = (): Camera => {
    const center = map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: 0,
    };
  };

  /* ---------------------------------------------------------------- *
   * Adapter surface
   * ---------------------------------------------------------------- */

  return {
    setCamera(next, opts) {
      const animate = opts?.animate !== false && !reducedMotion;
      map[animate ? "easeTo" : "jumpTo"]({
        center: next.center as LngLatLike,
        zoom: next.zoom,
        bearing: next.bearing ?? 0,
      });
    },
    getCamera: readCamera,
    fitBounds(bounds, pad, opts) {
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: pad, animate: opts?.animate !== false && !reducedMotion, maxZoom: 15 },
      );
    },
    setPadding(pad: Padding, opts) {
      const animate = opts?.animate !== false && !reducedMotion;
      map.easeTo({ padding: pad, duration: animate ? 300 : 0 });
    },
    setVenues(next) {
      venues = next;
      const source = map.getSource(VENUE_SOURCE) as GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: next.map((venue) => ({
          type: "Feature",
          id: venue.id,
          properties: { id: venue.id, name: venue.name, selectable: venue.selectable },
          geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
        })),
      });
      syncMarkers();
    },
    setSelectedVenue(id) {
      // MAP-31x — feature state, not a source swap.
      if (selectedId) {
        map.removeFeatureState({ source: VENUE_SOURCE, id: selectedId }, "selected");
      }
      selectedId = id;
      if (id) map.setFeatureState({ source: VENUE_SOURCE, id }, { selected: true });

      for (const marker of markers.values()) {
        const el = marker.getElement();
        if (!el.dataset.venueId) continue;
        if (el.dataset.venueId === id) el.dataset.selected = "true";
        else delete el.dataset.selected;
      }
    },
    setGeofence(circle) {
      const source = map.getSource(GEOFENCE_SOURCE) as GeoJSONSource | undefined;
      source?.setData(
        circle ? circlePolygon(circle) : { type: "FeatureCollection", features: [] },
      );
    },
    setVariant(next) {
      if (next === currentVariant) return;
      currentVariant = next;
      applyPalette(next);
    },
    on(event, handler) {
      listeners[event].add(handler as never);
      return () => listeners[event].delete(handler as never);
    },
    destroy() {
      destroyed = true;
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
    },
  };
}
