import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePetPersonality } from "@/context/playdates/PlaydatesProvider";
import { LIFE_STAGE_LABELS, MEETUP_TYPE_LABELS } from "./trait-labels";
import {
  type GuardingTrigger,
  type LifeStage,
  type MeetupType,
} from "@/lib/playdates/types";

const LIFE_STAGES = Object.keys(LIFE_STAGE_LABELS) as LifeStage[];
const MEETUP_TYPES = Object.keys(MEETUP_TYPE_LABELS) as MeetupType[];
const GUARDING: GuardingTrigger[] = ["toys", "food", "handler"];

/**
 * PQ-107 — hard filters are stored as explicit constraint records, distinct
 * from soft trait preferences, and they are *never* relaxed to fill a deck
 * (§6.2). Camila needs to declare "no dogs over 15kg" once and never see or
 * explain away a match that could go badly.
 */
export function HardFilterSheet({ petId, petName }: { petId: string; petName: string }) {
  const { getPreference, updateHardFilters, updatePreference } = usePetPersonality();
  const preference = getPreference(petId);
  const filters = preference.hardFilters;

  const activeCount =
    (filters.maxSizeKg !== null ? 1 : 0) +
    (filters.minSizeKg !== null ? 1 : 0) +
    (filters.excludedLifeStages.length > 0 ? 1 : 0) +
    (filters.excludedGuardingTriggers.length > 0 ? 1 : 0) +
    (preference.intactOptOut ? 1 : 0);

  const toggleLifeStage = (stage: LifeStage) => {
    updateHardFilters(petId, {
      excludedLifeStages: filters.excludedLifeStages.includes(stage)
        ? filters.excludedLifeStages.filter((s) => s !== stage)
        : [...filters.excludedLifeStages, stage],
    });
  };

  const toggleGuarding = (trigger: GuardingTrigger) => {
    updateHardFilters(petId, {
      excludedGuardingTriggers: filters.excludedGuardingTriggers.includes(trigger)
        ? filters.excludedGuardingTriggers.filter((t) => t !== trigger)
        : [...filters.excludedGuardingTriggers, trigger],
    });
  };

  const toggleMeetupType = (type: MeetupType) => {
    const next = preference.preferredMeetupTypes.includes(type)
      ? preference.preferredMeetupTypes.filter((t) => t !== type)
      : [...preference.preferredMeetupTypes, type];
    if (next.length === 0) return;
    updatePreference(petId, { preferredMeetupTypes: next });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="btn-bouncy min-h-[44px] gap-2 font-semibold">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Limits
          {activeCount > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl font-extrabold">{petName}'s limits</SheetTitle>
          <SheetDescription>
            These are enforced, not suggested. A pet outside them never appears in your deck and you
            never appear in theirs — we won't quietly widen them to fill your feed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-3">
            <Label className="text-sm font-bold">Size range</Label>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filters.minSizeKg ?? 0} kg</span>
              <span>{filters.maxSizeKg ?? 80}+ kg</span>
            </div>
            <Slider
              value={[filters.minSizeKg ?? 0, filters.maxSizeKg ?? 80]}
              min={0}
              max={80}
              step={1}
              aria-label="Acceptable size range in kilograms"
              onValueChange={([min, max]) =>
                updateHardFilters(petId, {
                  minSizeKg: min === 0 ? null : min,
                  maxSizeKg: max === 80 ? null : max,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave it wide open if size doesn't matter to you.
            </p>
          </section>

          <section className="space-y-2">
            <Label className="text-sm font-bold">Life stages to exclude</Label>
            <div className="flex flex-wrap gap-1.5">
              {LIFE_STAGES.map((stage) => {
                const excluded = filters.excludedLifeStages.includes(stage);
                return (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={excluded}
                    onClick={() => toggleLifeStage(stage)}
                    className={cn(
                      "btn-bouncy min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                      excluded
                        ? "border-destructive bg-destructive/10 text-destructive line-through"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span aria-hidden>{LIFE_STAGE_LABELS[stage].emoji}</span>{" "}
                    {LIFE_STAGE_LABELS[stage].label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-sm font-bold">Guarding I'd rather avoid</Label>
            <div className="flex flex-wrap gap-1.5">
              {GUARDING.map((trigger) => {
                const excluded = filters.excludedGuardingTriggers.includes(trigger);
                return (
                  <button
                    key={trigger}
                    type="button"
                    aria-pressed={excluded}
                    onClick={() => toggleGuarding(trigger)}
                    className={cn(
                      "btn-bouncy min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-all",
                      excluded
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {trigger}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Two pets who guard the same thing are always kept apart, whatever you pick here.
            </p>
          </section>

          <section className="space-y-2">
            <Label className="text-sm font-bold">Where you'd meet</Label>
            <div className="flex flex-wrap gap-1.5">
              {MEETUP_TYPES.map((type) => {
                const active = preference.preferredMeetupTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleMeetupType(type)}
                    className={cn(
                      "btn-bouncy min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span aria-hidden>{MEETUP_TYPE_LABELS[type].emoji}</span>{" "}
                    {MEETUP_TYPE_LABELS[type].label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <Label htmlFor="travel-distance" className="text-sm font-bold">
              How far you'll travel — {preference.maxTravelMiles} miles
            </Label>
            <Slider
              id="travel-distance"
              value={[preference.maxTravelMiles]}
              min={1}
              max={50}
              step={1}
              onValueChange={([miles]) => updatePreference(petId, { maxTravelMiles: miles })}
            />
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <ToggleRow
              id="intact-opt-out"
              label="Skip intact dogs"
              help="A safety filter for meetup compatibility only. Derps never uses intact status for discovery or matching."
              checked={preference.intactOptOut}
              onChange={(checked) => updatePreference(petId, { intactOptOut: checked })}
            />
            <ToggleRow
              id="cross-species"
              label="Open to other species"
              help="Cross-species matches only happen when both sides have turned this on."
              checked={preference.crossSpeciesOptIn}
              onChange={(checked) => updatePreference(petId, { crossSpeciesOptIn: checked })}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-bold">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
