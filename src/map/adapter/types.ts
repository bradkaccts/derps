/**
 * The renderer boundary (spec §6.1).
 *
 * Nothing outside `src/map/adapter` may import `maplibre-gl`. Everything the
 * product needs from a map renderer is expressed here, which is what makes the
 * renderer replaceable later without touching product code.
 */
import { type ThemeName } from "@/design-tokens/tokens";

export interface Camera {
  center: [lng: number, lat: number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapVenueFeature {
  id: string;
  name: string;
  lng: number;
  lat: number;
  /** Emoji glyph shown in the pin — mirrors the list view's venue-type icon. */
  glyph: string;
  typeLabel: string;
  distanceBand: string;
  /** False when the venue is unsuitable for the matched pair; pin is muted. */
  selectable: boolean;
}

export interface GeofenceCircle {
  center: [lng: number, lat: number];
  radiusMeters: number;
  /** Short title shown in the on-map tooltip. */
  label?: string;
  /** One-line explanation of what the circle represents. */
  description?: string;
}


export interface MapAdapterEvents {
  selectVenue: (id: string | null) => void;
  cameraChange: (camera: Camera) => void;
  error: (error: Error) => void;
}

export interface MapAdapter {
  setCamera(camera: Camera, opts?: { animate?: boolean }): void;
  getCamera(): Camera;
  fitBounds(
    bounds: [west: number, south: number, east: number, north: number],
    padding: Padding,
    opts?: { animate?: boolean },
  ): void;
  setPadding(padding: Padding, opts?: { animate?: boolean }): void;
  setVenues(venues: MapVenueFeature[]): void;
  setSelectedVenue(id: string | null): void;
  setGeofence(circle: GeofenceCircle | null): void;
  setVariant(variant: ThemeName): void;
  on<K extends keyof MapAdapterEvents>(event: K, handler: MapAdapterEvents[K]): () => void;
  destroy(): void;
}

export interface CreateAdapterOptions {
  container: HTMLElement;
  variant: ThemeName;
  camera: Camera;
  padding?: Padding;
  reducedMotion?: boolean;
  /** MAP-323 — hard cap on rendered venues per viewport. */
  maxRenderedVenues?: number;
}

export const NO_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };
