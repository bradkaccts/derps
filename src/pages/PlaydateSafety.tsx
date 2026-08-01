import { Link } from "react-router-dom";
import { Ban, FileText, LifeBuoy, Lock, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSafety } from "@/context/playdates/PlaydatesProvider";
import { mockPlaydateOwners } from "@/data/mock-playdate-pets";
import { REPORT_CATEGORY_LABELS } from "@/components/playdates/safety-copy";

/**
 * SEC-810 — the in-app Safety Center: block and report, meetup safety guidance,
 * incident reporting, and emergency-services guidance for the user's locale.
 *
 * §9.1 — this surface deliberately drops the whimsy. Warm creams and wiggling
 * paws are right for a swipe deck and wrong for the screen someone opens after
 * a bite. Tone follows stakes.
 */
const PlaydateSafety = () => {
  const { blocks, reports, unblockUser, trustBreakdown } = useSafety();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <LifeBuoy className="h-7 w-7" aria-hidden />
          Safety Center
        </h1>
        <p className="text-sm text-muted-foreground">
          How Derpdates protects you, and what to do when something goes wrong.
        </p>
      </header>

      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="font-bold text-foreground">If someone is hurt right now</h2>
        <p className="mt-1 text-sm text-foreground">
          Call <span className="font-bold">911</span>. For an animal-only incident in Ventura
          County, contact Ventura County Animal Services at{" "}
          <span className="font-bold">805-388-4341</span>. Get care first — report it to us
          afterwards, and we'll preserve the whole record for you.
        </p>
        <Button asChild variant="outline" className="mt-3 min-h-[44px] font-semibold">
          <Link to="/playdates/matches">Report an incident from the thread</Link>
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">What we do by default</h2>
        <ul className="space-y-2">
          <Guarantee icon={MapPin} title="Nobody can find where you live">
            We show a distance band — "1–3 mi" — and never an exact distance or a coordinate, in the
            app or in any response behind it. Photos have their location data stripped before we
            store them.
          </Guarantee>
          <Guarantee icon={Lock} title="Your contact details stay yours">
            Chat is relayed. No phone number, email or last name is shared at any point, including
            after you've met. There is nothing to take back if you change your mind.
          </Guarantee>
          <Guarantee icon={ShieldCheck} title="Meetups happen somewhere public">
            You can only propose a verified public venue. "Come to my house" isn't something the app
            can do.
          </Guarantee>
          <Guarantee icon={Ban} title="Blocking is total and silent">
            Block once and every pet in that household disappears from every pet in yours. They're
            never told.
          </Guarantee>
          <Guarantee icon={FileText} title="Your feedback is never shown to anyone">
            The private "how did it go" after a meetup is never visible to the other person, in any
            form. That's the only way honest answers are safe to give.
          </Guarantee>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Before a first meetup</h2>
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
          <AccordionItem value="arrive">
            <AccordionTrigger className="text-sm font-semibold">
              Arrive separately, leave separately
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Meet at the venue, not on the way there. Tell someone where you're going — the
              calendar invite has the venue and time on it already.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="leash">
            <AccordionTrigger className="text-sm font-semibold">
              Leashes on for the first five minutes
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Parallel-walk before you let them greet head-on. Most bad introductions are a greeting
              that happened too fast in too small a space.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="toys">
            <AccordionTrigger className="text-sm font-semibold">
              Leave the toys and treats in the car
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              We tell you when one of the pets guards something, but the simplest fix is to remove
              the thing worth guarding from the first meeting entirely.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="leave">
            <AccordionTrigger className="text-sm font-semibold">
              You can leave at any point, for any reason
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              You owe nobody an explanation. There's no rating to protect and no contact details
              they can follow you with.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Blocked people</h2>
        {blocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            You haven't blocked anyone.
          </p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => {
              const person = mockPlaydateOwners.find((o) => o.id === block.blockedUserId);
              return (
                <li
                  key={block.blockedUserId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div>
                    <p className="font-semibold text-foreground">{person?.name ?? "A member"}</p>
                    <p className="text-xs text-muted-foreground">
                      Blocked {new Date(block.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="min-h-[44px] font-semibold"
                    onClick={() => unblockUser(block.blockedUserId)}
                  >
                    Unblock
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Your reports</h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            You haven't filed any reports.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">
                    {REPORT_CATEGORY_LABELS[report.category]}
                  </p>
                  <Badge variant="secondary">{report.state}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Filed {new Date(report.createdAt).toLocaleDateString()} · reviewed by a person
                  within {report.category === "incident" ? "1 hour" : "4 hours"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold text-foreground">Your TrustScore</h2>
        <p className="text-sm text-muted-foreground">
          Adoption and Derpdates are scored separately and stay separately explainable. A park
          no-show and an adoption dispute are different things and we never blend them into one
          number you can't argue with.
        </p>
        <dl className="grid grid-cols-3 gap-2 pt-1">
          <ScoreTile label="Adoption" value={trustBreakdown.adoptionComponent} />
          <ScoreTile label="Derpdates" value={trustBreakdown.playdatesComponent} />
          <ScoreTile label="Combined" value={trustBreakdown.total} emphasis />
        </dl>
        <p className="pt-1 text-xs text-muted-foreground">
          Only your own behaviour moves this — showing up, or not. Nothing another owner says about
          your dog's play style ever counts against you.
        </p>
      </section>
    </div>
  );
};

function Guarantee({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function ScoreTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis
            ? "text-xl font-extrabold text-primary"
            : "text-xl font-bold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default PlaydateSafety;
