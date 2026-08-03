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
  Popup,
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
    clustersChanged: new Set(),
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

  /* ---------------------------------------------------------------- *
   * Startup (MAP-511) — a map that never loads must fail loudly.
   *
   * A dead web worker (bad dev pre-bundling, blocked blob: URL, CSP) means
   * `load` simply never fires. Without a deadline the caller awaits forever
   * and the UI shows a permanent spinner instead of the list fallback. So the
   * load is raced against a timeout and against fatal (non-source) errors.
   * Source-level errors — a tile 404, a flaky basemap — are reported but are
   * never fatal: the map is still usable without a backdrop.
   * ---------------------------------------------------------------- */
  const LOAD_TIMEOUT_MS = 10_000;
  let loadSettled = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;

  const startupError = (event: { error?: unknown; sourceId?: string }) =>
    event.error instanceof Error ? event.error : new Error("Map error");

  await new Promise<void>((resolve, reject) => {
    const settle = (fn: () => void) => {
      if (loadSettled) return;
      loadSettled = true;
      clearTimeout(loadTimer);
      map.off("error", onError);
      fn();
    };

    function onError(event: { error?: unknown; sourceId?: string }) {
      const err = startupError(event);
      // Tile/source failures degrade the map; they do not break it.
      if (event.sourceId) {
        emit("error", err);
        return;
      }
      settle(() => reject(err));
    }

    map.on("error", onError);
    loadTimer = setTimeout(() => {
      settle(() =>
        reject(
          new Error(
            `Map failed to load within ${LOAD_TIMEOUT_MS}ms — the MapLibre worker likely did not start`,
          ),
        ),
      );
    }, LOAD_TIMEOUT_MS);

    if (map.loaded()) settle(resolve);
    else map.once("load", () => settle(resolve));
  }).catch((err) => {
    map.remove();
    throw err;
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
    map.setPaintProperty("venue-geofence-glow", "line-color", palette.geofenceLine);
    container.dataset.derpsMapVariant = theme;
  };


  const palette = paletteFor(variant);

  map.addLayer({
    id: "venue-geofence-fill",
    type: "fill",
    source: GEOFENCE_SOURCE,
    paint: { "fill-color": palette.geofenceFill },
  });
  // Soft outer halo so the home area reads as a deliberate, blurred zone on
  // top of the basemap rather than a stray shape (MAP-612).
  map.addLayer({
    id: "venue-geofence-glow",
    type: "line",
    source: GEOFENCE_SOURCE,
    paint: {
      "line-color": palette.geofenceLine,
      "line-width": 12,
      "line-blur": 10,
      "line-opacity": 0.45,
    },
  });
  map.addLayer({
    id: "venue-geofence-line",
    type: "line",
    source: GEOFENCE_SOURCE,
    paint: { "line-color": palette.geofenceLine, "line-width": 3, "line-dasharray": [3, 2] },
  });

  /* ---------------------------------------------------------------- *
   * Geofence tooltip — hover (pointer) and tap (touch) both explain what
   * the blurred circle is, since the shape alone can't say it.
   * ---------------------------------------------------------------- */
  const geofencePopup = new Popup({
    closeButton: false,
    closeOnClick: false,
    className: "derps-map-popup",
    maxWidth: "240px",
  });

  const showGeofencePopup = (lngLat: LngLatLike, props: Record<string, unknown>) => {
    // Never two tooltips at once.
    hideVenuePopup(undefined, { keepSelected: false });

    const label = String(props.label || "Your home area");
    const description = String(
      props.description || "A blurred circle around your neighbourhood — never your exact address.",
    );
    geofencePopup
      .setLngLat(lngLat)
      .setHTML(
        `<strong class="derps-map-popup-title"></strong><span class="derps-map-popup-body"></span>`,
      )
      .addTo(map);
    const el = geofencePopup.getElement();
    const title = el?.querySelector(".derps-map-popup-title");
    const body = el?.querySelector(".derps-map-popup-body");
    if (title) title.textContent = label;
    if (body) body.textContent = description;
  };

  const highlightGeofence = (on: boolean) => {
    if (!map.getLayer("venue-geofence-line")) return;
    map.setPaintProperty("venue-geofence-line", "line-width", on ? 5 : 3);
    map.setPaintProperty("venue-geofence-glow", "line-opacity", on ? 0.8 : 0.45);
  };

  map.on("mousemove", "venue-geofence-fill", (event) => {
    map.getCanvas().style.cursor = "help";
    highlightGeofence(true);
    showGeofencePopup(event.lngLat, event.features?.[0]?.properties ?? {});
  });

  map.on("mouseleave", "venue-geofence-fill", () => {
    map.getCanvas().style.cursor = "";
    highlightGeofence(false);
    geofencePopup.remove();
  });

  map.on("click", "venue-geofence-fill", (event) => {
    highlightGeofence(true);
    showGeofencePopup(event.lngLat, event.features?.[0]?.properties ?? {});
  });


  /* ---------------------------------------------------------------- *
   * Markers — clusters and pins, clustered in screen space.
   *
   * Screen-space grouping rather than the source's built-in supercluster:
   * clustering has to agree with what the user can actually see, the pins are
   * DOM anyway, and it keeps marker sync independent of tile parsing.
   * ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- *
   * Pin tooltips (MAP-62x) — hover on a mouse, tap on touch.
   *
   * One popup instance is reused for every pin: two tooltips on screen at once
   * is noise, and reusing the instance keeps the DOM churn to the content.
   * Content is built as nodes, never interpolated HTML — venue names and rules
   * are user-facing strings and must not be parsed as markup.
   * ---------------------------------------------------------------- */
  const venuePopup = new Popup({
    closeButton: false,
    closeOnClick: false,
    className: "derps-map-popup derps-map-venue-popup",
    maxWidth: "260px",
    offset: 18,
  });

  let activeVenueId: string | null = null;
  let selectedPopupDismissed = false;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  const HOVER_DELAY_MS = 120;

  const venuePopupContent = (venue: MapVenueFeature) => {
    const root = document.createElement("div");
    root.className = "derps-map-tip";

    const title = document.createElement("strong");
    title.className = "derps-map-popup-title";
    title.textContent = venue.name;
    root.appendChild(title);

    const meta = document.createElement("span");
    meta.className = "derps-map-popup-body";
    meta.textContent = `${venue.typeLabel} · ${venue.distanceBand} away`;
    root.appendChild(meta);

    if (venue.amenityChips?.length) {
      const chips = document.createElement("div");
      chips.className = "derps-map-tip-chips";
      for (const chip of venue.amenityChips) {
        const node = document.createElement("span");
        node.className = "derps-map-tip-chip";
        node.dataset.tone = chip.tone;
        node.textContent = chip.note ? `${chip.label} · ${chip.note}` : chip.label;
        chips.appendChild(node);
      }
      root.appendChild(chips);
    }

    if (venue.detailLine) {
      const detail = document.createElement("span");
      detail.className = "derps-map-popup-body";
      detail.textContent = venue.detailLine;
      root.appendChild(detail);
    }

    if (venue.blockedReason) {
      const blocked = document.createElement("span");
      blocked.className = "derps-map-tip-blocked";
      blocked.textContent = venue.blockedReason;
      root.appendChild(blocked);
    } else if (venue.actionLabel) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "derps-map-tip-action";
      action.textContent = venue.actionLabel;
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        emit("selectVenue", venue.id);
      });
      root.appendChild(action);
    }

    return root;
  };

  const showVenuePopup = (venue: MapVenueFeature) => {
    geofencePopup.remove();
    activeVenueId = venue.id;
    venuePopup
      .setLngLat([venue.lng, venue.lat])
      .setDOMContent(venuePopupContent(venue))
      .addTo(map);
  };

  /** The chosen venue keeps its tooltip, so the current pick stays labelled. */
  const restoreSelectedPopup = () => {
    if (selectedPopupDismissed || !selectedId) return;
    const selected = venues.find((v) => v.id === selectedId);
    if (selected) showVenuePopup(selected);
  };

  const hideVenuePopup = (id?: string, { keepSelected = true } = {}) => {
    clearTimeout(hoverTimer);
    if (id && activeVenueId !== id) return;
    venuePopup.remove();
    activeVenueId = null;
    if (keepSelected) restoreSelectedPopup();
  };

  const clusterPopup = new Popup({
    closeButton: false,
    closeOnClick: false,
    className: "derps-map-popup",
    maxWidth: "200px",
    offset: 18,
  });

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

    // Touch has no hover, so a tap opens the tooltip and the tooltip's own
    // action commits the choice — a tap must never silently pick a venue.
    let lastPointerType = "mouse";
    el.addEventListener("pointerdown", (event) => {
      lastPointerType = event.pointerType || "mouse";
    });
    el.addEventListener("pointerenter", (event) => {
      if ((event.pointerType || "mouse") !== "mouse") return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showVenuePopup(venue), HOVER_DELAY_MS);
    });
    el.addEventListener("pointerleave", () => hideVenuePopup(venue.id));
    el.addEventListener("focus", () => {
      selectedPopupDismissed = false;
      showVenuePopup(venue);
    });
    el.addEventListener("blur", () => hideVenuePopup(venue.id));
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      selectedPopupDismissed = true;
      hideVenuePopup(undefined, { keepSelected: false });
    });
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      if (lastPointerType !== "mouse" && venue.actionLabel) {
        selectedPopupDismissed = false;
        showVenuePopup(venue);
        return;
      }
      emit("selectVenue", venue.id);
    });
    return el;
  };

  const makeCluster = (count: number, coords: [number, number]) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "derps-map-cluster";
    const label = `${count} spots here — zoom in`;
    el.setAttribute("aria-label", label);
    el.textContent = String(count);
    const showTip = () => {
      hideVenuePopup(undefined, { keepSelected: false });
      clusterPopup.setLngLat(coords).setText(label).addTo(map);
    };
    el.addEventListener("pointerenter", (event) => {
      if ((event.pointerType || "mouse") !== "mouse") return;
      showTip();
    });
    el.addEventListener("pointerleave", () => clusterPopup.remove());
    el.addEventListener("focus", showTip);
    el.addEventListener("blur", () => clusterPopup.remove());
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      clusterPopup.remove();
      map.easeTo({
        center: coords,
        zoom: Math.min(map.getZoom() + 2, CLUSTER_MAX_ZOOM + 1),
        duration: reducedMotion ? 0 : 400,
      });
    });
    return el;
  };


  const CLUSTER_PX = 56;
  let hasClusters = false;

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

    const nextHasClusters = groups.some((g) => g.venues.length > 1);
    if (nextHasClusters !== hasClusters) {
      hasClusters = nextHasClusters;
      emit("clustersChanged", hasClusters);
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
  map.on("click", () => {
    // A tap on open map dismisses the tooltip and clears the selection.
    selectedPopupDismissed = true;
    hideVenuePopup(undefined, { keepSelected: false });
    clusterPopup.remove();
    emit("selectVenue", null);
  });


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

      selectedPopupDismissed = false;
      if (id) {
        const selected = venues.find((v) => v.id === id);
        if (selected) showVenuePopup(selected);
      } else {
        hideVenuePopup(undefined, { keepSelected: false });
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
      clearTimeout(hoverTimer);
      venuePopup.remove();
      clusterPopup.remove();
      geofencePopup.remove();
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
    },

  };
}
