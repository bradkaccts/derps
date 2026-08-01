import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VenueBrowser } from "./VenueBrowser";
import { type PetTraitVector, type Venue } from "@/lib/playdates/types";

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00"];
const DURATIONS = [30, 45, 60, 90];

function defaultDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

/**
 * MP-407 — a Meetup Proposal captures venue, date, start time and duration, and
 * is sent as an interactive card into the thread.
 *
 * MP-404 is enforced structurally: the venue can only come from the curated
 * catalog. There is no free-text location field on this form, because "come to
 * my house" must not be a system-supported path (§10.2).
 */
export function MeetupComposer({
  open,
  onOpenChange,
  pairTraits,
  partnerName,
  initialVenueId,
  onPropose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairTraits?: [PetTraitVector, PetTraitVector];
  partnerName: string;
  initialVenueId?: string;
  onPropose: (input: { venueId: string; scheduledStart: string; durationMinutes: number }) => void;
}) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);

  const venueId = venue?.id ?? initialVenueId;

  const submit = () => {
    if (!venueId) return;
    const scheduledStart = new Date(`${date}T${time}:00`).toISOString();
    onPropose({ venueId, scheduledStart, durationMinutes: duration });
    onOpenChange(false);
    setVenue(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">
            Propose a Derpdate with {partnerName}
          </DialogTitle>
          <DialogDescription>
            Pick a verified public spot and a time. {partnerName}'s human can accept, decline, or
            suggest something else.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="meetup-date" className="font-semibold">
              Date
            </Label>
            <Input
              id="meetup-date"
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetup-time" className="font-semibold">
              Start
            </Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="meetup-time" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetup-duration" className="font-semibold">
              How long
            </Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger id="meetup-duration" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <VenueBrowser
          pairTraits={pairTraits}
          onSelect={setVenue}
          selectedVenueId={venueId}
          className="pt-1"
        />

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background pt-3">
          <Button
            className="btn-bouncy min-h-[44px] flex-1 gap-2 font-bold"
            disabled={!venueId}
            onClick={submit}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {venue ? `Propose ${venue.name}` : "Pick a venue first"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
