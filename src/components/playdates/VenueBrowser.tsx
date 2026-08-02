import { useMemo, useState } from "react";
import { List, Map as MapIcon, ShieldAlert, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockVenues } from "@/data/mock-venues";
import { DerpsMap } from "@/map/DerpsMap";
import { HOME_AREA, venueResultsToFeatures } from "@/map/venue-features";
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import {
  AMENITY_EMOJI,
  AMENITY_LABELS,
  VENUE_TYPE_EMOJI,
  VENUE_TYPE_LABELS,
  filterVenues,
  rankVenuesForPair,
  selectableVenues,
  type VenueFilters,
  type VenueResult,
} from "@/lib/playdates/venues";
import {
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
 * of the same result set. UI-706 — the list is a fully equivalent view, not a
 * degraded fallback: it is the primary view for screen-reader and low-vision
 * users, and it is the default here.
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
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<VenueFilters>({ types: [], amenities: [], maxMiles: 25 });

  const results = useMemo(() => {
    // MP-404 — only verified catalog venues are ever selectable.
    const catalog = onSelect ? selectableVenues(mockVenues) : mockVenues;
    const filtered = filterVenues(catalog, HOME_GEO, filters);
    return pairTraits ? rankVenuesForPair(filtered, pairTraits[0], pairTraits[1]) : filtered;
  }, [filters, pairTraits, onSelect]);

  const features = useMemo(() => venueResultsToFeatures(results), [results]);

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

      <p className="text-sm text-muted-foreground">
        {results.length} verified {results.length === 1 ? "venue" : "venues"} nearby. Every meetup on
        Derps happens somewhere public and checked — you can't propose a home address.
      </p>

      {view === "map" ? (
        <DerpsMap
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted"
          label={`Map of ${results.length} verified venues around your area. The same venues are listed below.`}
          venues={features}
          camera={{ center: HOME_AREA.center, zoom: 11 }}
          geofence={HOME_AREA}
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
          overlay={<HomeAreaLegend />}
        />

      ) : null}


      <ul className="space-y-3">
        {results.map(({ venue, distanceBand, recommendation }) => (
          <li key={venue.id}>
            <VenueRow
              venue={venue}
              distanceBand={distanceBand}
              recommendation={recommendation}
              onSelect={onSelect}
              selected={selectedVenueId === venue.id}
            />
          </li>
        ))}
      </ul>

      {results.length === 0 && (
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
  onSelect,
  selected,
}: VenueResult & { onSelect?: (venue: Venue) => void; selected?: boolean }) {
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
        {venue.amenities.map((amenity) => (
          <Badge key={amenity} variant="secondary" className="gap-1 text-xs font-medium">
            <span aria-hidden>{AMENITY_EMOJI[amenity]}</span>
            {AMENITY_LABELS[amenity]}
          </Badge>
        ))}
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

  if (!onSelect) {
    return <div className="rounded-xl border border-border bg-card p-3">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(venue)}
      disabled={recommendation ? !recommendation.suitable : false}
      className={cn(
        "btn-bouncy w-full rounded-xl border-2 bg-card p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      {body}
    </button>
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

/** Always-visible key for the blurred circle, with the full explanation on hover/tap. */
function HomeAreaLegend() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur"
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full border-2 border-dashed border-primary bg-primary/20"
          />
          Your home area
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[240px] text-xs">
        {HOME_AREA.description}
      </TooltipContent>
    </Tooltip>
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
