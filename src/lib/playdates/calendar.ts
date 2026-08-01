/**
 * Calendar export (MP-408). On acceptance the meetup is offered as an `.ics`
 * download; two-way calendar sync is a V2 concern.
 *
 * The venue name and the pets' names go in — nothing that identifies the other
 * owner does, since the `.ics` leaves the platform's control the moment it is
 * downloaded.
 */
import { type Meetup, type Venue } from "./types";

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildMeetupICS(params: {
  meetup: Meetup;
  venue: Venue;
  actorPetName: string;
  partnerPetName: string;
}): string {
  const { meetup, venue, actorPetName, partnerPetName } = params;
  const start = toICSDate(meetup.scheduledStart);
  const end = toICSDate(
    new Date(new Date(meetup.scheduledStart).getTime() + meetup.durationMinutes * 60_000).toISOString(),
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Derps//Playdates//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${meetup.id}@derps.app`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(`Derpdate: ${actorPetName} & ${partnerPetName}`)}`,
    `LOCATION:${escapeICS(`${venue.name}, ${venue.neighborhood}`)}`,
    `DESCRIPTION:${escapeICS(
      `${venue.name} — ${venue.leashRules}. Check in from the Derps app when you arrive.`,
    )}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(`Derpdate with ${partnerPetName} in an hour`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function downloadICS(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** MP-411 — reminders fire 24h and 1h before a meetup. */
export const REMINDER_OFFSETS_MINUTES = [24 * 60, 60];

export function nextReminderAt(scheduledStart: string, now: Date = new Date()): Date | null {
  const start = new Date(scheduledStart).getTime();
  for (const offset of [...REMINDER_OFFSETS_MINUTES].sort((a, b) => b - a)) {
    const at = start - offset * 60_000;
    if (at > now.getTime()) return new Date(at);
  }
  return null;
}
