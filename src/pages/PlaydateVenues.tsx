import { useState } from "react";
import { MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VenueBrowser } from "@/components/playdates/VenueBrowser";
import { useMeetups } from "@/context/playdates/PlaydatesProvider";
import { toast } from "sonner";

/**
 * Phase 4 — the curated venue directory (§5.4). Browsable without a match, and
 * the only surface a Guest can reach (§10.1): it is genuinely useful on its own
 * and gives someone a reason to sign up.
 */
const PlaydateVenues = () => {
  const { suggestVenue, venueSuggestions } = useMeetups();
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">Places to meet</h1>
          <p className="text-sm text-muted-foreground">
            Checked, public spots around Ventura County — fenced, off-leash, small-dog areas and all.
          </p>
        </div>

        {/* MP-406 — suggestions enter a moderation queue and never appear live. */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="btn-bouncy min-h-[44px] gap-2 font-semibold">
              <MapPinPlus className="h-4 w-4" aria-hidden />
              Suggest a spot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold">Know a good spot?</DialogTitle>
              <DialogDescription>
                Tell us where and we'll check it out. Suggestions don't go live until someone on our
                team has verified them — that's what keeps this list trustworthy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="venue-name" className="font-semibold">
                  Venue name
                </Label>
                <Input
                  id="venue-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Foster Park lower field"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venue-area" className="font-semibold">
                  Area
                </Label>
                <Input
                  id="venue-area"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  placeholder="e.g. Ventura"
                  className="min-h-[44px]"
                />
              </div>
              <Button
                className="btn-bouncy min-h-[44px] w-full font-bold"
                disabled={!name.trim()}
                onClick={() => {
                  suggestVenue({ name: name.trim(), neighborhood: neighborhood.trim() });
                  setName("");
                  setNeighborhood("");
                  setOpen(false);
                  toast.success("Thanks! It's in the queue for review 🗺️");
                }}
              >
                Send it in
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {venueSuggestions.length > 0 && (
        <p className="mb-4 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          You've suggested {venueSuggestions.length} spot
          {venueSuggestions.length === 1 ? "" : "s"} — pending review.
        </p>
      )}

      <VenueBrowser />
    </div>
  );
};

export default PlaydateVenues;
