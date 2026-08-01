/**
 * Derps Playdates — domain types.
 *
 * Playdates extends the adoption product's `Pet`/`User` records rather than
 * forking them (§7.1). Everything new lives in satellite records keyed by
 * `petId` so a pet adopted through Derps can be socialised the next week
 * without a reconciliation step.
 */
import { type Pet, type Species } from "@/data/mock-pets";

/* ------------------------------------------------------------------ *
 * Versioning (§13.6) — every artefact the model touches is versioned.
 * ------------------------------------------------------------------ */

export const QUIZ_VERSION = "canine-v1";
export const DERIVATION_VERSION = "derive-v1";
export const FEATURE_VERSION = "feat-v1";
export const MODEL_VERSION = "rules-v1";

/* ------------------------------------------------------------------ *
 * Trait vector (§5.1)
 * ------------------------------------------------------------------ */

export type PlayStyle = "wrestler" | "chaser" | "toy_focused" | "parallel" | "observer";
export type LifeStage = "puppy" | "adolescent" | "adult" | "senior";
export type GuardingTrigger = "toys" | "food" | "handler";
export type MeetupType = "on_leash_walk" | "fenced_yard" | "open_park" | "indoor";

export type TraitDimension =
  | "energy"
  | "play_style"
  | "dog_sociability"
  | "confidence"
  | "size_kg"
  | "life_stage"
  | "noise"
  | "resource_guarding"
  | "recall_reliability";

export interface PetTraitVector {
  /** 1 (Couch Potato) – 5 (Perpetual Motion) */
  energy: number;
  play_style: PlayStyle;
  /** 1 (selective) – 5 (loves everyone) */
  dog_sociability: number;
  /** 1 (timid) – 5 (bold) */
  confidence: number;
  size_kg: number;
  life_stage: LifeStage;
  /** 1 (silent) – 5 (very vocal) */
  noise: number;
  /** empty array = no declared guarding */
  resource_guarding: GuardingTrigger[];
  /** 1 – 5; gates off-leash venue recommendations */
  recall_reliability: number;
}

/** Per-dimension confidence, 0–1. Low confidence pulls the score toward 70. */
export type TraitConfidence = Record<TraitDimension, number>;

/**
 * PetPersonality — 1:1 with Pet, versioned (§7.2). `traits` is a *derived*
 * artefact: it can always be rebuilt from the stored QuizResponse rows, which
 * is what makes PQ-104 (offline re-derivation) possible.
 */
export interface PetPersonality {
  petId: string;
  quizVersion: string;
  derivationVersion: string;
  traits: PetTraitVector;
  confidence: TraitConfidence;
  completedAt: string | null;
  updatedAt: string;
  /** PQ-106 — previous vectors are retained as history, never overwritten. */
  history: PersonalityRevision[];
}

export interface PersonalityRevision {
  traits: PetTraitVector;
  confidence: TraitConfidence;
  derivationVersion: string;
  replacedAt: string;
}

/** QuizResponse — raw answers, the source of truth (§7.2). Retained permanently. */
export interface QuizResponse {
  id: string;
  petId: string;
  quizVersion: string;
  questionKey: string;
  answerKeys: string[];
  answeredAt: string;
}

/* ------------------------------------------------------------------ *
 * Quiz definition (§5.1)
 * ------------------------------------------------------------------ */

export type TraitSignal = Partial<{
  energy: number;
  play_style: PlayStyle;
  dog_sociability: number;
  confidence: number;
  size_kg: number;
  life_stage: LifeStage;
  noise: number;
  resource_guarding: GuardingTrigger[];
  recall_reliability: number;
}>;

export interface QuizAnswerOption {
  key: string;
  label: string;
  emoji: string;
  /** Trait values this answer asserts. Absent on handler-preference questions. */
  signals?: TraitSignal;
  /** Preference values this answer asserts (handler questions). */
  preference?: Partial<HandlerPreferenceInput>;
  /**
   * PQ-102 — "Not sure yet" contributes no value and lowers the dimension's
   * confidence instead of forcing a guess.
   */
  notSure?: boolean;
}

export interface QuizQuestion {
  key: string;
  prompt: string;
  helper?: string;
  /** Dimensions whose confidence this question informs. */
  dimensions: TraitDimension[];
  kind: "trait" | "handler";
  multi?: boolean;
  options: QuizAnswerOption[];
}

/* ------------------------------------------------------------------ *
 * Handler preferences & hard filters (§5.1, PQ-107)
 * ------------------------------------------------------------------ */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TimeSlot = "morning" | "midday" | "evening";
export type AvailabilityWindow = `${Weekday}-${TimeSlot}`;

export interface HandlerPreferenceInput {
  maxTravelMiles: number;
  preferredMeetupTypes: MeetupType[];
  availabilityWindows: AvailabilityWindow[];
}

/**
 * Hard filters are stored as explicit constraint records, distinct from soft
 * trait preferences (PQ-107). They are never relaxed to fill a deck (§6.2).
 */
export interface HardFilters {
  maxSizeKg: number | null;
  minSizeKg: number | null;
  excludedLifeStages: LifeStage[];
  /** Guarding triggers the handler will not tolerate in a partner. */
  excludedGuardingTriggers: GuardingTrigger[];
}

export interface PetPreference {
  petId: string;
  maxTravelMiles: number;
  preferredMeetupTypes: MeetupType[];
  availabilityWindows: AvailabilityWindow[];
  hardFilters: HardFilters;
  /** Cross-species matches require *both* parties to opt in (§6.3). */
  crossSpeciesOptIn: boolean;
  /** REG-910 — intact is a bidirectional safety filter, never a discovery signal. */
  intactOptOut: boolean;
}

/* ------------------------------------------------------------------ *
 * Geo (§10.2) — precise storage, banded exposure.
 * ------------------------------------------------------------------ */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type DistanceBand = "<1 mi" | "1-3 mi" | "3-10 mi" | "10+ mi";

/* ------------------------------------------------------------------ *
 * The social pet record
 * ------------------------------------------------------------------ */

export type SocialStatus = "Active" | "Paused" | "Memorial" | "Transferred";

export interface VaccinationAttestation {
  attestedAt: string;
  expiresAt: string;
}

/**
 * PlaydatePet extends the adoption `Pet` (§7.1). `Pet.status` remains the
 * adoption lifecycle field and is deliberately not overloaded — social
 * lifecycle lives in `socialStatus`.
 */
export interface PlaydatePet extends Pet {
  ownerId: string;
  socialStatus: SocialStatus;
  isPlaydateActive: boolean;
  vaccination: VaccinationAttestation | null;
  intact: boolean;
  ageWeeks: number;
  /**
   * Readable only by the scoring module. Never returned from `buildFeed` —
   * see `toFeedCard`, which emits a `DistanceBand` and nothing else.
   */
  homeGeo: GeoPoint;
  lastActiveAt: string;
  /** v1 prior for P(candidate likes actor) (§6.5). */
  historicalRightSwipeRate: number;
  /** Owner-level: demotes people who match and never reply (§6.5). */
  ownerResponsiveness: number;
  /** Set when the pet or its owner is under an open incident review (§6.3). */
  safetyHold: boolean;
}

export interface ScoredPet {
  pet: PlaydatePet;
  personality: PetPersonality;
  preference: PetPreference;
}

/* ------------------------------------------------------------------ *
 * Scoring (§6.4, §6.6)
 * ------------------------------------------------------------------ */

export type ContributionKind = "trait" | "gate" | "modifier";

export interface FeatureContribution {
  dimension: string;
  label: string;
  weight: number;
  /** Raw sub-score in [0,1] before weighting. */
  subScore: number;
  /** weight × subScore for traits; the multiplier itself for gates/modifiers. */
  contribution: number;
  kind: ContributionKind;
}

export interface ScoreResult {
  /** 0–100, already clamped and confidence-adjusted. */
  score: number;
  /** RE-601 — per-dimension contributions ship alongside every score. */
  featureContributions: FeatureContribution[];
  meanConfidence: number;
  /** RE-605 — true when the score was held down by low trait confidence. */
  confidenceCapped: boolean;
}

export interface ScoringContext {
  distanceMiles: number;
  /** The actor's declared travel tolerance, used by `distance_decay`. */
  preferredMiles: number;
}

/**
 * The stable seam (§6.1). The v1 rules engine implements this; a learned model
 * in V1+ implements the same interface and nothing upstream or downstream
 * changes. Nothing outside this module reads a raw trait to make a decision.
 */
export interface ScoringStrategy {
  readonly id: string;
  readonly modelVersion: string;
  readonly featureVersion: string;
  score(actor: ScoredPet, candidate: ScoredPet, context: ScoringContext): ScoreResult;
}

/* ------------------------------------------------------------------ *
 * Candidate pipeline (§6.2 – §6.5)
 * ------------------------------------------------------------------ */

export type HardFilterReason =
  | "species"
  | "size_limit"
  | "life_stage_limit"
  | "vaccination"
  | "puppy_protection"
  | "mutual_resource_guarding"
  | "guarding_trigger_excluded"
  | "mutual_low_sociability"
  | "intact_status"
  | "safety_hold"
  | "block";

export interface FilterOutcome {
  passed: boolean;
  reason?: HardFilterReason;
}

export interface CandidateSet {
  candidates: ScoredPet[];
  /** Miles actually searched after any widening. */
  radiusMiles: number;
  /** §6.2 — widening is always labelled in the UI, never silent. */
  widened: boolean;
  requestedRadiusMiles: number;
}

export interface RankedCandidate {
  candidate: ScoredPet;
  scoreResult: ScoreResult;
  distanceMiles: number;
  rankScore: number;
  reciprocityPrior: number;
  novelty: number;
  responsiveness: number;
  isExploration: boolean;
}

/* ------------------------------------------------------------------ *
 * Feed cards — the only pet shape the UI is allowed to see.
 * ------------------------------------------------------------------ */

export interface PublicTraitSummary {
  energy: number;
  playStyle: PlayStyle;
  lifeStage: LifeStage;
  sizeKg: number;
  sociability: number;
}

export interface FeedCard {
  petId: string;
  name: string;
  breed: string;
  age: string;
  species: Species;
  photos: string[];
  healthVerified: boolean;
  /** SEC-803 — a band, never a distance and never a coordinate. */
  distanceBand: DistanceBand;
  score: number;
  /** RE-602 — templated from the top two positive contributors. */
  reason: string;
  /** RE-604 — honest disclosure where a soft gate materially cut the score. */
  gateDisclosures: string[];
  contributions: FeatureContribution[];
  meanConfidence: number;
  confidenceCapped: boolean;
  traits: PublicTraitSummary;
  archetype: string;
  rankPosition: number;
  impressionId: string;
  strategyId: string;
  modelVersion: string;
  featureVersion: string;
  /** SW-212 — exploration cards are visually indistinguishable; this never reaches the renderer. */
  isExploration: boolean;
  /** SW-209 — this pet booped you; surfaced at the top of the deck. */
  boopedYou: boolean;
}

export interface Deck {
  cards: FeedCard[];
  radiusMiles: number;
  widened: boolean;
  requestedRadiusMiles: number;
  /** True when the deck is empty because no pet cleared the hard filters. */
  exhausted: boolean;
  strategyId: string;
}

/* ------------------------------------------------------------------ *
 * Swipes, matches, chat (§5.2, §5.3)
 * ------------------------------------------------------------------ */

export type SwipeDirection = "like" | "pass" | "boop";

export interface Swipe {
  id: string;
  actorPetId: string;
  targetPetId: string;
  direction: SwipeDirection;
  impressionId: string;
  scoreAtImpression: number;
  featureVersion: string;
  modelVersion: string;
  strategyId: string;
  createdAt: string;
}

export type MatchState = "Active" | "Expired" | "Closed" | "Blocked" | "Pals";

export interface Match {
  id: string;
  /** Stored with petAId < petBId so a pair can only ever produce one row. */
  petAId: string;
  petBId: string;
  state: MatchState;
  matchedAt: string;
  /** CH-307 — 7 days from match unless a message lands. Null once Pals. */
  expiresAt: string | null;
  firstMessageAt: string | null;
  meetupCount: number;
}

export type MessageType = "text" | "image" | "card";

export interface PlaydateMessage {
  id: string;
  matchId: string;
  senderUserId: string;
  type: MessageType;
  body: string;
  /** CH-305 — incoming images stay blurred until the recipient taps to view. */
  mediaRef?: string;
  revealed?: boolean;
  /** Structured inline cards (CH-308). */
  card?: MeetupProposalCard | VenueShareCard | VaccinationCard;
  sentAt: string;
  /** CH-304 — logged when the sender proceeded past a contact-sharing warning. */
  contactWarningAcknowledged?: boolean;
}

export interface MeetupProposalCard {
  kind: "meetup_proposal";
  meetupId: string;
}

export interface VenueShareCard {
  kind: "venue_share";
  venueId: string;
}

export interface VaccinationCard {
  kind: "vaccination";
  petId: string;
  expiresAt: string;
}

/* ------------------------------------------------------------------ *
 * Venues & meetups (§5.4)
 * ------------------------------------------------------------------ */

export type VenueType =
  | "dog_park"
  | "public_park"
  | "trail"
  | "beach"
  | "pet_friendly_patio"
  | "indoor_facility";

export type VenueAmenity =
  | "fenced"
  | "off_leash_permitted"
  | "separate_small_dog_area"
  | "water"
  | "shade"
  | "parking"
  | "restrooms"
  | "lighting";

export type VerificationState = "verified" | "pending" | "rejected";

export interface Venue {
  id: string;
  name: string;
  geo: GeoPoint;
  venueType: VenueType;
  amenities: VenueAmenity[];
  leashRules: string;
  hours: string;
  source: "osm" | "places" | "user_submitted" | "staff";
  verificationState: VerificationState;
  verifiedAt: string | null;
  /** MP-412 — surfaces a "recently reported" flag on the venue card. */
  incidentFlagCount: number;
  neighborhood: string;
}

export type MeetupState =
  | "Proposed"
  | "Accepted"
  | "Declined"
  | "Cancelled"
  | "Completed"
  | "NoShow";

export interface Meetup {
  id: string;
  matchId: string;
  venueId: string;
  proposedByUserId: string;
  scheduledStart: string;
  durationMinutes: number;
  state: MeetupState;
  checkinAAt: string | null;
  checkinBAt: string | null;
  recurrenceRule: string | null;
}

export type FeedbackOverall = "great" | "fine" | "not_a_fit";

export type FeedbackTag =
  | "too_rough"
  | "too_shy"
  | "great_energy_match"
  | "guarded_resources"
  | "owner_was_great"
  | "didnt_show";

/**
 * FB-502 — never joined into any user-facing read path. The subject of the
 * feedback can never read it, in raw or aggregate form.
 */
export interface MeetupFeedback {
  id: string;
  meetupId: string;
  authorUserId: string;
  subjectPetId: string;
  overall: FeedbackOverall;
  tags: FeedbackTag[];
  /** FB-503 — routed to Trust & Safety only, never rendered to any user. */
  freeText: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Safety (§5.3, §10)
 * ------------------------------------------------------------------ */

export type ReportCategory =
  | "harassment"
  | "misrepresentation"
  | "incident"
  | "scam"
  | "other";

export interface SafetyReport {
  id: string;
  reporterUserId: string;
  subjectUserId: string;
  subjectPetId: string | null;
  category: ReportCategory;
  contextRef: string;
  state: "open" | "reviewing" | "resolved";
  resolution: string | null;
  createdAt: string;
}

/** CH-306 — always user-level, never pet-level. Blocking Priya blocks all three dogs. */
export interface Block {
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Instrumentation (§6.7) — ships with the MVP even though nothing
 * consumes it until V1. You cannot retroactively log impressions.
 * ------------------------------------------------------------------ */

export interface Impression {
  id: string;
  actorPetId: string;
  candidatePetId: string;
  rankPosition: number;
  score: number;
  featureVector: FeatureContribution[];
  featureVersion: string;
  modelVersion: string;
  strategyId: string;
  shownAt: string;
  dwellMs: number | null;
}
