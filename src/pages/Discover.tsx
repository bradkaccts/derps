import { useMemo, useState } from "react";
import { Compass, MapPin, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { cn } from "@/lib/utils";
import { useRemotePool } from "@/hooks/use-remote-pool";
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import { buildMockPool } from "@/data/mock-playdate-pets";
import { bandForMiles, haversineMiles } from "@/lib/playdates/geo";
import { LIFE_STAGE_LABELS, PLAY_STYLE_LABELS, energyLabel } from "@/components/playdates/trait-labels";
import { type LifeStage, type PlayStyle, type ScoredPet } from "@/lib/playdates/types";

type DistanceKey = "2" | "5" | "15" | "any";

const DISTANCE_OPTIONS: { key: DistanceKey; label: string; emoji: string; miles: number }[] = [
  { key: "2", label: "Walkable", emoji: "🚶", miles: 2 },
  { key: "5", label: "5 miles", emoji: "🚗", miles: 5 },
  { key: "15", label: "15 miles", emoji: "🛣️", miles: 15 },
  { key: "any", label: "Anywhere", emoji: "🌎", miles: Number.POSITIVE_INFINITY },
];

const LIFE_STAGES: LifeStage[] = ["puppy", "adolescent", "adult", "senior"];
const PLAY_STYLES: PlayStyle[] = ["wrestler", "chaser", "toy_focused", "parallel", "observer"];

/** Big, tappable filter icon — never a dropdown. */
function FilterChip({
  active,
  emoji,
  label,
  onClick,
}: {
  active: boolean;
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-w-[5.5rem] flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2.5 text-xs font-bold transition-all active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      {label}
    </button>
  );
}

const Discover = () => {
  const { remotePool, loadingRemotePool: loading } = useRemotePool();
  const [distance, setDistance] = useState<DistanceKey>("any");
  const [stages, setStages] = useState<LifeStage[]>([]);
  const [styles, setStyles] = useState<PlayStyle[]>([]);
  const [query, setQuery] = useState("");

  const pool = useMemo<ScoredPet[]>(() => [...remotePool, ...buildMockPool()], [remotePool]);

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const maxMiles = DISTANCE_OPTIONS.find((o) => o.key === distance)!.miles;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pool
      .map((entry) => ({
        entry,
        miles: haversineMiles(HOME_GEO, entry.pet.homeGeo),
      }))
      .filter(({ entry, miles }) => {
        if (miles > maxMiles) return false;
        if (stages.length && !stages.includes(entry.personality.traits.life_stage)) return false;
        if (styles.length && !styles.includes(entry.personality.traits.play_style)) return false;
        if (needle) {
          const hay = `${entry.pet.name} ${entry.pet.breed} ${entry.pet.location}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => a.miles - b.miles);
  }, [pool, maxMiles, stages, styles, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-foreground">
          <Compass className="h-7 w-7 text-primary" aria-hidden />
          Discover Derps
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse every Derp nearby — filter by how far, how old and how they like to play.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, breed or town"
          aria-label="Search Derps"
          className="pl-9"
        />
      </div>

      <section aria-labelledby="filter-distance" className="space-y-2">
        <h2 id="filter-distance" className="text-sm font-bold text-foreground">
          How far?
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DISTANCE_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              active={distance === option.key}
              emoji={option.emoji}
              label={option.label}
              onClick={() => setDistance(option.key)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="filter-age" className="space-y-2">
        <h2 id="filter-age" className="text-sm font-bold text-foreground">
          How old?
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LIFE_STAGES.map((stage) => (
            <FilterChip
              key={stage}
              active={stages.includes(stage)}
              emoji={LIFE_STAGE_LABELS[stage].emoji}
              label={LIFE_STAGE_LABELS[stage].label}
              onClick={() => toggle(stages, stage, setStages)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="filter-personality" className="space-y-2">
        <h2 id="filter-personality" className="text-sm font-bold text-foreground">
          How do they play?
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PLAY_STYLES.map((style) => (
            <FilterChip
              key={style}
              active={styles.includes(style)}
              emoji={PLAY_STYLE_LABELS[style].emoji}
              label={PLAY_STYLE_LABELS[style].label}
              onClick={() => toggle(styles, style, setStyles)}
            />
          ))}
        </div>
      </section>

      <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
        {loading ? "Sniffing around…" : `${results.length} Derp${results.length === 1 ? "" : "s"} found`}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <DerpyEmpty
          title="No Derps match those picks"
          message="Try widening the distance or clearing a filter — there are more Derps just outside the net."
        />
      ) : (
        <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map(({ entry, miles }) => {
            const traits = entry.personality.traits;
            return (
              <Card key={entry.pet.id} className="overflow-hidden transition-all hover:shadow-lg">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={entry.pet.photos[0]}
                    alt={`${entry.pet.name}, a ${entry.pet.breed}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="space-y-2 p-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{entry.pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.pet.breed} · {entry.pet.age}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {bandForMiles(miles)} away
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="gap-1 text-xs font-medium">
                      <span aria-hidden>{LIFE_STAGE_LABELS[traits.life_stage].emoji}</span>
                      {LIFE_STAGE_LABELS[traits.life_stage].label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-xs font-medium">
                      <span aria-hidden>{PLAY_STYLE_LABELS[traits.play_style].emoji}</span>
                      {PLAY_STYLE_LABELS[traits.play_style].label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-xs font-medium">
                      <span aria-hidden>⚡</span>
                      {energyLabel(traits.energy)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Discover;
