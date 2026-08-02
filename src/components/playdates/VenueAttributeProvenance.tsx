import { AlertTriangle, CircleHelp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AMENITY_EMOJI, AMENITY_LABELS } from "@/lib/playdates/venues";
import { provenanceLine } from "@/lib/playdates/venue-confidence";
import { type VenueAttributeAggregate } from "@/lib/playdates/types";

/**
 * Attribute provenance for the venue detail view (§5.4).
 *
 * The rule this component exists to enforce: a confirmation state is never
 * shown as a badge or a score, and never uses the word "verified" (VC-322,
 * VC-325). Every line says who many people said it and when, so the reader can
 * judge for themselves how much to lean on it.
 */
export function VenueAttributeProvenance({
  aggregates,
  className,
}: {
  aggregates: VenueAttributeAggregate[];
  className?: string;
}) {
  // VC-321 — an attribute nobody has reported is shown as unknown, not hidden,
  // so the absence of evidence is legible.
  const rows = aggregates;
  if (rows.length === 0) return null;

  return (
    <dl className={cn("space-y-1.5", className)}>
      {rows.map((aggregate) => {
        const line = provenanceLine(aggregate);
        const disputed = aggregate.state === "disputed";
        const unknown = aggregate.state === "unknown";
        return (
          <div key={aggregate.attributeKey} className="flex items-start gap-2 text-xs">
            <dt className="flex min-w-[7.5rem] shrink-0 items-center gap-1 font-semibold text-foreground">
              <span aria-hidden>{AMENITY_EMOJI[aggregate.attributeKey]}</span>
              {AMENITY_LABELS[aggregate.attributeKey]}
              {aggregate.value === "no" && !unknown && (
                <span className="font-normal text-muted-foreground">(no)</span>
              )}
            </dt>
            <dd
              className={cn(
                "flex items-start gap-1",
                disputed ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {disputed && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />}
              {unknown && <CircleHelp className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />}
              {!disputed && !unknown && <Users className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />}
              <span>{line ?? "No visitor reports yet"}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
