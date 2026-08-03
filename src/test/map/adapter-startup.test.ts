/**
 * MAP-511 — a MapLibre worker that never starts must fail loudly.
 *
 * These tests drive `createMapLibreAdapter` against a fake MapLibre `Map` so we
 * can reproduce the failure modes that used to hang forever: a `load` event
 * that never fires, and a fatal style/worker error raised before load.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: unknown) => void;

/** Fake MapLibre map: fires nothing unless a test tells it to. */
class FakeMap {
  static instances: FakeMap[] = [];
  handlers = new Map<string, Set<Handler>>();
  removed = false;
  touchZoomRotate = { disableRotation: () => {} };

  constructor() {
    FakeMap.instances.push(this);
  }
  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }
  once(event: string, handler: Handler) {
    return this.on(event, handler);
  }
  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }
  fire(event: string, payload?: unknown) {
    for (const handler of [...(this.handlers.get(event) ?? [])]) handler(payload);
  }
  loaded() {
    return false;
  }
  easeTo() {}
  remove() {
    this.removed = true;
  }
  addSource() {}
  addLayer() {}
  setPaintProperty() {}
  getCanvas() {
    return { style: {} };
  }
}

vi.mock("maplibre-gl", () => ({
  Map: FakeMap,
  Marker: class {},
  Popup: class {},
  GeoJSONSource: class {},
}));

async function startAdapter() {
  const { createMapLibreAdapter } = await import("@/map/adapter/maplibre-adapter");
  const container = document.createElement("div");
  return createMapLibreAdapter({
    container,
    variant: "day",
    camera: { center: [-0.12, 51.5], zoom: 12 },
  });
}

describe("createMapLibreAdapter startup", () => {
  beforeEach(() => {
    FakeMap.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects instead of hanging when the worker never fires load", async () => {
    const promise = startAdapter();
    promise.catch(() => {});
    // Let the dynamic import settle so the load timer is actually registered.
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_100);
    await expect(promise).rejects.toThrow(/did not start/i);

    expect(FakeMap.instances[0].removed).toBe(true);

  });

  it("rejects on a fatal pre-load error", async () => {
    const promise = startAdapter();
    const assertion = expect(promise).rejects.toThrow(/worker exploded/);
    await vi.advanceTimersByTimeAsync(0);
    FakeMap.instances[0].fire("error", { error: new Error("worker exploded") });
    await assertion;
  });

  it("ignores source-level errors and still resolves on load", async () => {
    const promise = startAdapter();
    await vi.advanceTimersByTimeAsync(0);
    const map = FakeMap.instances[0];
    // A basemap tile 404 must not kill the map.
    map.fire("error", { error: new Error("tile 404"), sourceId: "basemap" });
    map.fire("load");
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBeDefined();
    expect(map.removed).toBe(false);
  });
});
