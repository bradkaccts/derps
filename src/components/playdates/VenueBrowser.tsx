import { useEffect, useMemo, useRef, useState } from "react";
import { List, Map as MapIcon, ShieldAlert, Star, Check, Info, X, Search, LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { mockVenues } from "@/data/mock-venues";
import { DerpsMap } from "@/map/DerpsMap";
import { MAP_ANCHOR, venueResultsToFeatures } from "@/map/venue-features";
import { shouldOfferAreaSearch } from "@/lib/playdates/map-search-area";
import { type Camera } from "@/map/adapter/types";
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import {
  AMENITY_EMOJI,
  AMENITY_LABELS,
  VENUE_TYPE_EMOJI,
  VENUE_TYPE_LABELS,
  filterVenues,
  rankVenuesForPair,
  recommendVenue,
  selectableVenues,
  type VenueFilters,
  type VenueResult,
} from "@/lib/playdates/venues";
import { useVenueConfidence } from "@/context/playdates/VenueConfidenceContext";
import { VenueAttributeProvenance } from "./VenueAttributeProvenance";
import { isFencedConfident } from "@/lib/playdates/venue-confidence";
import {
  type VenueAttributeAggregate,
  type PetTraitVector,
  type Venue,
  type VenueAmenity,
  type VenueType,
} from "@/lib/playdates/types";

const TYPE_OPTIONS = Object.keys(VENUE_TYPE_LABELS) as VenueType[];
const AMENITY_OPTIONS = Object.keys(AMENITY_LABELS) as VenueAmenity[];
const DISTANCE_OPTIONS = [3, 10, 25, 50];

/**
 * MP-403 — filter by amenity, venue type and distance, with list and map views
 * of the same result set. The map is the default view for spatial browsing; the
 * list remains a fully equivalent, accessible alternative for screen-reader and
 * low-vision users.
 *
 * The map is schematic rather than a tiled basemap. That is deliberate for
 * this build — venue positions are relative and approximate, which keeps the
 * surface honest about what it is showing.
 */
export function VenueBrowser({
  pairTraits,
  onSelect,
  selectedVenueId,
  className,
}: {
  pairTraits?: [PetTraitVector, PetTraitVector];
  onSelect?: (venue: Venue) => void;
  selectedVenueId?: string;
  className?: string;
}) {
  const [view, setView] = useState<"list" | "map">("map");
  const [hasClusters, setHasClusters] = useState(false);
  const [filters, setFilters] = useState<VenueFilters>({ types: [], amenities: [], maxMiles: 25 });
  const { attributeStates } = useVenueConfidence();

  // MAP-701 — results are measured from a movable search origin, so panning the
  // map somewhere else can re-run the search over there.
  const [searchOrigin, setSearchOrigin] = useState(HOME_GEO);
  const [camera, setCamera] = useState<Camera>({ center: MAP_ANCHOR.center, zoom: 11 });
  const [canSearchArea, setCanSearchArea] = useState(false);
  const [searching, setSearching] = useState(false);
  const lastCameraRef = useRef<Camera>(camera);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const movedFromHome =
    searchOrigin.lat !== HOME_GEO.lat || searchOrigin.lng !== HOME_GEO.lng;

  const evaluateDrift = (cam: Camera) => {
    lastCameraRef.current = cam;
    setCanSearchArea(
      shouldOfferAreaSearch({
        origin: searchOrigin,
        center: { lat: cam.center[1], lng: cam.center[0] },
        zoom: cam.zoom,
        widthPx: mapWrapRef.current?.clientWidth || 640,
      }),
    );
  };

  const searchThisArea = () => {
    const cam = lastCameraRef.current;
    setSearchOrigin({ lat: cam.center[1], lng: cam.center[0] });
    setCanSearchArea(false);
    setSearching(true);
  };

  const resetArea = () => {
    setSearchOrigin(HOME_GEO);
    setCamera({ center: MAP_ANCHOR.center, zoom: 11 });
    setCanSearchArea(false);
    setSearching(true);
  };

  useEffect(() => {
    if (!searching) return;
    const t = window.setTimeout(() => setSearching(false), 420);
    return () => window.clearTimeout(t);
  }, [searching]);

  const results = useMemo(() => {
    // MP-404 — only verified catalog venues are ever selectable.
    const catalog = onSelect ? selectableVenues(mockVenues) : mockVenues;
    const filtered = filterVenues(catalog, searchOrigin, filters);
    const ranked = pairTraits
      ? rankVenuesForPair(filtered, pairTraits[0], pairTraits[1])
      : filtered;

    // VC-313 — re-run the pair recommendation with visitor confirmation in
    // hand, so a disputed fence downgrades the advice rather than the static
    // amenity flag carrying the day.
    if (!pairTraits) return ranked;
    return ranked.map((result) => {
      const aggregates = attributeStates(result.venue.id, result.venue.venueType);
      const fenced = aggregates.find((a) => a.attributeKey === "fenced");
      return {
        ...result,
        recommendation: recommendVenue(result.venue, pairTraits[0], pairTraits[1], {
          confirmedFenced: isFencedConfident(aggregates),
          disputed: fenced?.state === "disputed",
        }),
      };
    });
  }, [filters, pairTraits, onSelect, attributeStates, searchOrigin]);


  const features = useMemo(
    () =>
      venueResultsToFeatures(results, {
        aggregatesFor: attributeStates,
        selectable: Boolean(onSelect),
      }),
    [results, attributeStates, onSelect],
  );


  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
        <FilterRow label="Type">
          {TYPE_OPTIONS.map((type) => (
            <FilterChip
              key={type}
              active={filters.types.includes(type)}
              onClick={() => setFilters((f) => ({ ...f, types: toggle(f.types, type) }))}
            >
              <span aria-hidden>{VENUE_TYPE_EMOJI[type]}</span> {VENUE_TYPE_LABELS[type]}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Must have">
          {AMENITY_OPTIONS.map((amenity) => (
            <FilterChip
              key={amenity}
              active={filters.amenities.includes(amenity)}
              tone="accent"
              onClick={() =>
                setFilters((f) => ({ ...f, amenities: toggle(f.amenities, amenity) }))
              }
            >
              <span aria-hidden>{AMENITY_EMOJI[amenity]}</span> {AMENITY_LABELS[amenity]}
            </FilterChip>
          ))}
        </FilterRow>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterRow label="Within">
            {DISTANCE_OPTIONS.map((miles) => (
              <FilterChip
                key={miles}
                active={filters.maxMiles === miles}
                onClick={() => setFilters((f) => ({ ...f, maxMiles: miles }))}
              >
                {miles} mi
              </FilterChip>
            ))}
          </FilterRow>

          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <ViewToggle active={view === "list"} onClick={() => setView("list")} icon={List} label="List" />
            <ViewToggle active={view === "map"} onClick={() => setView("map")} icon={MapIcon} label="Map" />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {results.length} verified {results.length === 1 ? "venue" : "venues"}{" "}
        {movedFromHome ? "in this area" : "nearby"}. Every meetup on Derps happens somewhere public
        and checked — you can't propose a home address.
        {movedFromHome && (
          <button
            type="button"
            onClick={resetArea}
            className="ml-1.5 inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
          >
            <LocateFixed className="h-3.5 w-3.5" aria-hidden />
            Reset to my area
          </button>
        )}
      </p>

      {view === "map" ? (
        <div ref={mapWrapRef}>
          <DerpsMap
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted"
            label={`Map of ${results.length} verified venues around your area. The same venues are listed below.`}
            venues={features}
            camera={camera}
            geofence={null}
            selectedVenueId={selectedVenueId ?? null}
            onSelectVenue={(id) => {
              if (!id || !onSelect) return;
              const hit = results.find((r) => r.venue.id === id);
              if (hit && (hit.recommendation?.suitable ?? true)) onSelect(hit.venue);
            }}
            fallback={
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Your browser can't show the map, so here's the full list instead — it has everything
                the map does.
              </p>
            }
            onClustersChanged={setHasClusters}
            onCameraChange={evaluateDrift}
            overlay={
              <>
                {(canSearchArea || searching) && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={searchThisArea}
                      disabled={searching}
                      aria-busy={searching}
                      className="btn-bouncy pointer-events-auto flex min-h-[40px] items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-bold text-foreground shadow-md backdrop-blur disabled:opacity-70"
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                      ) : (
                        <Search className="h-4 w-4 text-primary" aria-hidden />
                      )}
                      {searching ? "Searching…" : "Search this area"}
                    </button>
                  </div>
                )}
                {searching && (
                  <div className="animate-fade-in pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
                    <span className="flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                      Finding spots here…
                    </span>
                  </div>
                )}
                <MapLegend selectable={Boolean(onSelect)} hasClusters={hasClusters} />
              </>
            }
          />
        </div>
      ) : null}

      {searching ? (
        <ul className="animate-fade-in space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-xl border border-border p-4">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="mt-2 h-3 w-3/5" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="animate-fade-in space-y-3">
          {results.map(({ venue, distanceBand, recommendation }) => (
            <li key={venue.id}>
              <VenueRow
                venue={venue}
                distanceBand={distanceBand}
                recommendation={recommendation}
                aggregates={attributeStates(venue.id, venue.venueType)}
                onSelect={onSelect}
                selected={selectedVenueId === venue.id}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {searching ? "Searching this area" : `${results.length} venues found`}
      </p>


      {!searching && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-bold text-foreground">No venues match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try dropping an amenity or widening the distance.
          </p>
          <Button
            variant="outline"
            className="btn-bouncy mt-3 min-h-[44px] font-semibold"
            onClick={() => setFilters({ types: [], amenities: [], maxMiles: 50 })}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

function VenueRow({
  venue,
  distanceBand,
  recommendation,
  aggregates,
  onSelect,
  selected,
}: VenueResult & {
  aggregates: VenueAttributeAggregate[];
  onSelect?: (venue: Venue) => void;
  selected?: boolean;
}) {
  const stateFor = (amenity: VenueAmenity) =>
    aggregates.find((a) => a.attributeKey === amenity);
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-bold text-foreground">
            <span aria-hidden>{VENUE_TYPE_EMOJI[venue.venueType]}</span>
            {venue.name}
            {recommendation?.preferred && (
              <Star className="h-4 w-4 fill-accent text-accent" aria-label="Recommended for this pair" />
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {VENUE_TYPE_LABELS[venue.venueType]} · {venue.neighborhood} · {distanceBand}
          </p>
        </div>
        {selected && <Check className="h-5 w-5 shrink-0 text-primary" aria-label="Selected" />}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {venue.amenities.map((amenity) => {
          // VC-322 — the amenity chip carries confirmation state as plain
          // language, not as a badge or a score.
          const aggregate = stateFor(amenity);
          const disputed = aggregate?.state === "disputed";
          const confirmed = aggregate?.state === "confirmed" && aggregate.value === "yes";
          return (
            <Badge
              key={amenity}
              variant="secondary"
              className={cn(
                "gap-1 text-xs font-medium",
                disputed && "bg-destructive/10 text-destructive",
              )}
            >
              <span aria-hidden>{AMENITY_EMOJI[amenity]}</span>
              {AMENITY_LABELS[amenity]}
              {confirmed && (
                <span className="font-normal opacity-80">
                  · {aggregate.nDistinct} confirmed
                </span>
              )}
              {disputed && <span className="font-normal">· mixed reports</span>}
            </Badge>
          );
        })}
      </div>


      {/* MP-412 — posted leash rules travel with the venue, always. */}
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Rules:</span> {venue.leashRules} · {venue.hours}
      </p>

      {recommendation?.notes.map((note) => (
        <p
          key={note}
          className={cn(
            "mt-1.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
            recommendation.suitable ? "bg-secondary/60 text-foreground" : "bg-destructive/10 text-destructive",
          )}
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {note}
        </p>
      ))}
    </>
  );

  /*
   * Provenance sits outside the selection button on purpose: a disclosure
   * control nested inside a button is unreachable by keyboard, and reading the
   * evidence must never be the same gesture as choosing the venue.
   */
  const provenance = aggregates.length > 0 && (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
        What visitors say about this place
      </summary>
      <VenueAttributeProvenance aggregates={aggregates} className="mt-1.5" />
    </details>
  );

  if (!onSelect) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        {body}
        {provenance}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(venue)}
        disabled={recommendation ? !recommendation.suitable : false}
        className="btn-bouncy w-full rounded-xl p-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        {body}
      </button>
      <div className="px-3 pb-3">{provenance}</div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  tone = "primary",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "primary" | "accent";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "btn-bouncy flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
        active
          ? tone === "accent"
            ? "border-accent bg-accent text-accent-foreground"
            : "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * MAP-618 — an always-visible key for every symbol the map draws.
 */
function MapLegend({
  selectable,
  hasClusters,
}: {
  selectable: boolean;
  hasClusters: boolean;
}) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur"
      >
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
        Legend
      </button>
    );
  }

  const rows: { kind: string; label: string }[] = [
    { kind: "pin", label: "Meet-up spot" },

    ...(selectable
      ? [
          { kind: "selected", label: "Selected" },
          { kind: "disabled", label: "Not a fit for this pair" },
        ]
      : []),
    ...(hasClusters ? [{ kind: "cluster", label: "Several spots — tap to expand" }] : []),
  ];

  return (
    <div className="absolute bottom-3 left-3 max-w-[62%] rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <dl className="space-y-1">
          {rows.map((row) => (
            <div key={row.kind} className="flex items-center gap-2">
              <dt className="flex items-center">
                <span
                  aria-hidden="true"
                  data-kind={row.kind}
                  className="derps-map-legend-swatch"
                />
                <span className="sr-only">{row.label} symbol</span>
              </dt>
              <dd className="text-[11px] font-semibold leading-tight text-foreground">
                {row.label}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide map legend"
          className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}


function ViewToggle({

  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
