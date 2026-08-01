import type { InteractionStatus, InteractionType } from "./models";

/**
 * The single source of truth for interaction lifecycles.
 *
 *  playdate:            requested → accepted → scheduled → completed
 *                        └→ declined   └→ declined  └→ declined(cancel)
 *
 *  adoption-application: draft → submitted → under-review → shortlisted
 *                        → approved → completed (hand-off done, phase 2)
 *                        (declinable at any pre-terminal stage)
 *
 * The mock provider enforces this today; the same table drives DB CHECK
 * constraints / trigger validation in step 2 so clients can never write an
 * illegal transition.
 */

const PLAYDATE_TRANSITIONS: Partial<Record<InteractionStatus, InteractionStatus[]>> = {
  requested: ["accepted", "declined"],
  accepted: ["scheduled", "declined"],
  scheduled: ["completed", "declined"],
};

const ADOPTION_TRANSITIONS: Partial<Record<InteractionStatus, InteractionStatus[]>> = {
  draft: ["submitted"],
  submitted: ["under-review", "declined"],
  "under-review": ["shortlisted", "declined"],
  shortlisted: ["approved", "declined"],
  approved: ["completed", "declined"],
};

const TRANSITIONS: Record<InteractionType, Partial<Record<InteractionStatus, InteractionStatus[]>>> = {
  playdate: PLAYDATE_TRANSITIONS,
  "adoption-application": ADOPTION_TRANSITIONS,
};

/** Statuses at which an interaction of the given type begins. */
export const INITIAL_STATUS: Record<InteractionType, InteractionStatus> = {
  playdate: "requested",
  "adoption-application": "submitted", // drafts are created explicitly
};

export const TERMINAL_STATUSES: ReadonlySet<InteractionStatus> = new Set([
  "completed",
  "declined",
]);

export function validStatusesFor(type: InteractionType): InteractionStatus[] {
  const table = TRANSITIONS[type];
  const all = new Set<InteractionStatus>();
  for (const [from, tos] of Object.entries(table)) {
    all.add(from as InteractionStatus);
    for (const to of tos ?? []) all.add(to);
  }
  return [...all];
}

export function canTransition(
  type: InteractionType,
  from: InteractionStatus,
  to: InteractionStatus
): boolean {
  return (TRANSITIONS[type][from] ?? []).includes(to);
}

/** Throwing variant for provider implementations. */
export function assertTransition(
  type: InteractionType,
  from: InteractionStatus,
  to: InteractionStatus
): void {
  if (!canTransition(type, from, to)) {
    throw new Error(
      `Illegal ${type} transition: "${from}" → "${to}". Allowed: ${
        (TRANSITIONS[type][from] ?? []).join(", ") || "(none — terminal state)"
      }`
    );
  }
}

/** System-message copy for lifecycle events, keyed by new status. */
export const STATUS_SYSTEM_MESSAGES: Record<InteractionType, Partial<Record<InteractionStatus, string>>> = {
  playdate: {
    accepted: "🎉 Derpdate accepted! Schedule a time below.",
    declined: "😢 Derpdate declined.",
    scheduled: "📅 Derpdate scheduled!",
    completed: "✅ Derpdate completed! Hope they had fun!",
  },
  "adoption-application": {
    submitted: "📨 Application submitted.",
    "under-review": "🔍 Application is under review.",
    shortlisted: "⭐ You've been shortlisted!",
    approved: "🎉 Application approved!",
    declined: "Application declined.",
    completed: "🏡 Adoption complete — happy Gotcha Day!",
  },
};
