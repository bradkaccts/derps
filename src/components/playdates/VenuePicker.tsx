import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsUpDown, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import { discoverVenuesNear, useVenueCatalog } from "@/lib/playdates/venue-store";
import { emptyVenueFilters, filterVenues, selectableVenues, VENUE_TYPE_EMOJI } from "@/lib/playdates/venues";
import { type GeoPoint, type Venue } from "@/lib/playdates/types";

/** Searchable drop-down of public meetup spots near the user — no free-text addresses. */
export function VenuePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (venue: Venue) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<GeoPoint>(HOME_GEO);
  const [loading, setLoading] = useState(false);
  const catalog = useVenueCatalog();

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    discoverVenuesNear(origin, 10)
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, origin]);

  const results = useMemo(
    () => filterVenues(selectableVenues(catalog), origin, { ...emptyVenueFilters, maxMiles: 10 }),
    [catalog, origin],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between px-3 text-sm font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{value || "Pick a nearby spot"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search spots..." />
          <CommandList>
            {loading && results.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding spots near you...
              </p>
            ) : (
              <CommandEmpty>No spots nearby yet.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading={loading ? "Nearby · looking for more..." : "Nearby"}>
                {results.map(({ venue, distanceBand }) => (
                  <CommandItem
                    key={venue.id}
                    value={`${venue.name} ${venue.neighborhood} ${venue.id}`}
                    onSelect={() => {
                      onChange(venue);
                      setOpen(false);
                    }}
                  >
                    <span className="mr-2" aria-hidden>{VENUE_TYPE_EMOJI[venue.venueType]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{venue.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[venue.neighborhood, distanceBand].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex justify-between border-t border-border px-3 py-2 text-xs font-semibold">
            <Link to="/playdates/venues" className="text-primary hover:underline">See all on the map</Link>
            <Link to="/playdates/venues" className="text-muted-foreground hover:underline">Suggest a spot</Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
