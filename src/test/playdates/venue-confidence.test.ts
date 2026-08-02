import { describe, expect, it } from "vitest";
import {
  aggregateAttribute,
  isFencedConfident,
  provenanceLine,
  selectQuestions,
  weighObservations,
} from "@/lib/playdates/venue-confidence";
import { venueAttributeByKey } from "@/data/venue-attributes";
import { type VenueObservation, type VenueObservationValue } from "@/lib/playdates/types";

const NOW = new Date("2026-01-01T12:00:00Z");
const DAY_MS = 86_400_000;

function obs(
  userId: string,
  meetupId: string,
  daysAgo: number,
  value: VenueObservationValue,
  attributeKey: VenueObservation["attributeKey"] = "parking",
): VenueObservation {
  return {
    id: `${userId}-${meetupId}-${attributeKey}`,
    venueId: "v1",
    attributeKey,
    value,
    userId,
    meetupId,
    observedAt: new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString(),
  };
}

const parking = venueAttributeByKey.parking;
const fenced = venueAttributeByKey.fenced;

describe("effective weight (§5.2)", () => {
  it("halves at one half-life", () => {
    const [weighted] = weighObservations([obs("a", "m1", 365, "yes")], 365, NOW);
    expect(weighted.weight).toBeCloseTo(0.5, 5);
  });

  it("discounts co-attendees of the same meetup to 0.5", () => {
    const weighted = weighObservations(
      [obs("a", "m1", 0, "yes"), obs("b", "m1", 0, "yes"), obs("c", "m2", 0, "yes")],
      365,
      NOW,
    );
    expect(weighted.map((w) => w.weight)).toEqual([1, 0.5, 1]);
  });

  it("supersedes an earlier observation from the same user", () => {
    const aggregate = aggregateAttribute(
      [obs("a", "m1", 200, "yes"), obs("a", "m2", 5, "no")],
      parking,
      NOW,
    );
    expect(aggregate.nDistinct).toBe(1);
    expect(aggregate.value).toBe("no");
  });

  it("never lets one observation exceed weight 1.0", () => {
    const [weighted] = weighObservations([obs("a", "m1", 0, "yes")], 365, NOW);
    expect(weighted.weight).toBeLessThanOrEqual(1);
  });
});

describe("confidence states (§5.3)", () => {
  it("stays unknown below the minimum weight", () => {
    expect(aggregateAttribute([obs("a", "m1", 1500, "yes")], parking, NOW).state).toBe("unknown");
  });

  it("is reported with a single fresh observer", () => {
    expect(aggregateAttribute([obs("a", "m1", 1, "yes")], parking, NOW).state).toBe("reported");
  });

  it("requires three distinct users across two meetups to confirm", () => {
    const oneMeetup = aggregateAttribute(
      [obs("a", "m1", 1, "yes"), obs("b", "m1", 1, "yes"), obs("c", "m1", 1, "yes")],
      parking,
      NOW,
    );
    // VC-431 — three people at one meetup is one observation event.
    expect(oneMeetup.state).not.toBe("confirmed");

    const twoMeetups = aggregateAttribute(
      [obs("a", "m1", 1, "yes"), obs("b", "m2", 2, "yes"), obs("c", "m3", 3, "yes")],
      parking,
      NOW,
    );
    expect(twoMeetups.state).toBe("confirmed");
  });

  it("marks a standard attribute disputed when two dissenters break agreement", () => {
    const aggregate = aggregateAttribute(
      [
        obs("a", "m1", 1, "yes"),
        obs("b", "m2", 1, "yes"),
        obs("c", "m3", 1, "no"),
        obs("d", "m4", 1, "no"),
      ],
      parking,
      NOW,
    );
    expect(aggregate.state).toBe("disputed");
  });

  it("gives no weight to 'not sure'", () => {
    const aggregate = aggregateAttribute(
      [obs("a", "m1", 1, "unsure"), obs("b", "m2", 1, "unsure")],
      parking,
      NOW,
    );
    expect(aggregate.wTot).toBe(0);
    expect(aggregate.state).toBe("unknown");
  });

  it("decays a past confirmation to stale rather than holding it forever", () => {
    const aggregate = aggregateAttribute(
      [
        obs("a", "m1", 700, "yes"),
        obs("b", "m2", 720, "yes"),
        obs("c", "m3", 740, "yes"),
        obs("d", "m4", 760, "yes"),
      ],
      parking,
      NOW,
    );
    expect(aggregate.state).toBe("stale");
  });
});

describe("safety-critical asymmetry (§5.3, VC-310..313)", () => {
  const yesFour = [
    obs("a", "m1", 1, "yes", "fenced"),
    obs("b", "m2", 2, "yes", "fenced"),
    obs("c", "m3", 3, "yes", "fenced"),
    obs("d", "m4", 4, "yes", "fenced"),
  ];

  it("needs four distinct users to confirm fenced", () => {
    expect(aggregateAttribute(yesFour, fenced, NOW).state).toBe("confirmed");
    expect(aggregateAttribute(yesFour.slice(0, 3), fenced, NOW).state).toBe("reported");
  });

  it("lets a single credible 'no' override four confirmations", () => {
    const aggregate = aggregateAttribute(
      [...yesFour, obs("e", "m5", 0, "no", "fenced")],
      fenced,
      NOW,
    );
    expect(aggregate.state).toBe("disputed");
    expect(isFencedConfident([aggregate])).toBe(false);
  });

  it("treats anything short of confirmed-yes as unfenced", () => {
    for (const observations of [[], yesFour.slice(0, 2)]) {
      expect(isFencedConfident([aggregateAttribute(observations, fenced, NOW)])).toBe(false);
    }
    expect(isFencedConfident([aggregateAttribute(yesFour, fenced, NOW)])).toBe(true);
  });

  it("confirms an unfenced report on weaker evidence than a fenced one", () => {
    const aggregate = aggregateAttribute(
      [obs("a", "m1", 1, "no", "fenced"), obs("b", "m2", 2, "no", "fenced")],
      fenced,
      NOW,
    );
    expect(aggregate.state).toBe("confirmed");
    expect(aggregate.value).toBe("no");
  });
});

describe("question selection (§4.2)", () => {
  const base = {
    venueId: "v1",
    venueType: "dog_park" as const,
    userId: "me",
    now: NOW,
    random: () => 0.5,
  };

  it("asks at most two questions, and one on a first-ever check-in", () => {
    expect(selectQuestions({ ...base, observations: [], firstEverCheckin: false })).toHaveLength(2);
    expect(selectQuestions({ ...base, observations: [], firstEverCheckin: true })).toHaveLength(1);
  });

  it("prioritises a disputed attribute over an unreported one", () => {
    const observations = [
      obs("a", "m1", 1, "yes", "water"),
      obs("b", "m2", 1, "yes", "water"),
      obs("c", "m3", 1, "no", "water"),
      obs("d", "m4", 1, "no", "water"),
    ];
    const [first] = selectQuestions({ ...base, observations, firstEverCheckin: false });
    expect(first.attributeKey).toBe("water");
  });

  it("does not re-ask what this user answered here recently (VC-404)", () => {
    const observations = [obs("me", "m9", 3, "yes", "parking")];
    const keys = selectQuestions({ ...base, observations, firstEverCheckin: false }).map(
      (d) => d.attributeKey,
    );
    expect(keys).not.toContain("parking");
  });

  it("drops confirmed, fresh attributes from the pool (VC-405)", () => {
    const observations = [
      obs("a", "m1", 1, "yes", "parking"),
      obs("b", "m2", 2, "yes", "parking"),
      obs("c", "m3", 3, "yes", "parking"),
    ];
    const keys = selectQuestions({ ...base, observations, firstEverCheckin: false }).map(
      (d) => d.attributeKey,
    );
    expect(keys).not.toContain("parking");
  });

  it("only asks questions applicable to the venue type", () => {
    const keys = selectQuestions({
      ...base,
      venueType: "beach",
      observations: [],
      firstEverCheckin: false,
    }).map((d) => d.attributeKey);
    expect(keys).not.toContain("fenced");
    expect(keys).not.toContain("separate_small_dog_area");
  });
});

describe("display language (§5.4)", () => {
  it("never says verified, and always pairs count with recency", () => {
    const aggregate = aggregateAttribute(
      [obs("a", "m1", 1, "yes"), obs("b", "m2", 2, "yes"), obs("c", "m3", 3, "yes")],
      parking,
      NOW,
    );
    const line = provenanceLine(aggregate, NOW);
    expect(line).toMatch(/3 visitors/);
    expect(line).toMatch(/yesterday/);
    expect(line?.toLowerCase()).not.toContain("verified");
  });

  it("shows both sides of a dispute rather than picking a winner", () => {
    const aggregate = aggregateAttribute(
      [
        obs("a", "m1", 1, "yes"),
        obs("b", "m2", 1, "yes"),
        obs("c", "m3", 1, "no"),
        obs("d", "m4", 1, "no"),
      ],
      parking,
      NOW,
    );
    expect(provenanceLine(aggregate, NOW)).toMatch(/2 say yes, 2 say no/);
  });

  it("returns nothing for an unknown attribute", () => {
    expect(provenanceLine(aggregateAttribute([], parking, NOW), NOW)).toBeNull();
  });
});
