import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, ShieldCheck, ClipboardList, HeartHandshake } from "lucide-react";
import { mockPets } from "@/data/mock-pets";
import { vibeConfig } from "@/lib/vibes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFavorites } from "@/context/FavoritesContext";
import { useApplications } from "@/context/ApplicationContext";
import { useMyPets } from "@/context/MyPetsContext";
import { usePlaydates } from "@/context/PlaydateContext";
import { calculateMatchScore } from "@/lib/matching";
import { MatchScoreBadge } from "@/components/pets/MatchScoreBadge";
import { currentUser } from "@/data/mock-users";
import { AdoptionForm } from "@/components/applications/AdoptionForm";
import { ApplicationStatusTracker } from "@/components/applications/ApplicationStatusTracker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PetProfile = () => {
  const { id } = useParams();
  const { toggleFavorite, isFavorited } = useFavorites();
  const { getApplicationForPetByAdopter } = useApplications();
  const { activePet } = useMyPets();
  const { requestPlaydate, getRequestForPet } = usePlaydates();
  const [formOpen, setFormOpen] = useState(false);
  const favorited = id ? isFavorited(id) : false;
  const pet = mockPets.find((p) => p.id === id);
  const existingApp = pet ? getApplicationForPetByAdopter(pet.id, currentUser.id) : undefined;
  const existingPlaydate = pet ? getRequestForPet(pet.id) : undefined;

  const match = pet && activePet ? calculateMatchScore(activePet, pet) : null;

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <span className="text-6xl mb-4">🤷</span>
        <h2 className="text-xl font-bold text-foreground mb-2">Derp not found!</h2>
        <Link to="/" className="text-primary font-semibold hover:underline">
          Back to browsing
        </Link>
      </div>
    );
  }

  const handlePlaydateRequest = () => {
    if (!activePet) return;
    requestPlaydate(activePet.id, pet.id);
    toast.success(`Playdate request sent to ${pet.name}! 🐾`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="md:flex md:gap-8">
        {/* Media Gallery */}
        <div className="md:w-1/2">
          <div className="relative">
            <Link
              to="/"
              className="absolute top-4 left-4 z-10 flex items-center gap-1 rounded-full bg-card/80 backdrop-blur px-3 py-1.5 text-sm font-semibold text-foreground shadow"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="aspect-square md:rounded-lg overflow-hidden">
              <img
                src={pet.photos[0]}
                alt={pet.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          {pet.photos.length > 1 && (
            <div className="flex gap-2 p-4">
              {pet.photos.map((photo, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border">
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4 md:w-1/2 md:py-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">{pet.name}</h1>
              <p className="text-muted-foreground font-medium">
                {pet.breed} · {pet.age} · {pet.gender === "male" ? "♂" : "♀"}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => id && toggleFavorite(id)}>
              <Heart className={cn("h-6 w-6", favorited ? "fill-accent text-accent" : "text-accent")} />
            </Button>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4" />
            {pet.location} · {pet.distanceKm}km away
          </div>

          {pet.healthVerified && (
            <div className="flex items-center gap-1.5 mb-4 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Verified Health Records
            </div>
          )}

          {/* Vibes with shared highlighting */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {pet.vibes.map((vibe) => {
              const config = vibeConfig[vibe];
              const isShared = match?.sharedVibes.includes(vibe);
              return (
                <Badge
                  key={vibe}
                  variant={isShared ? "default" : "secondary"}
                  className={cn("gap-1 font-semibold", isShared && "ring-1 ring-primary/30")}
                >
                  <span>{config.icon}</span>
                  {config.label}
                  {isShared && <span className="text-[10px]">✓</span>}
                </Badge>
              );
            })}
          </div>

          {/* Playdate Match Card */}
          {match && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
                <MatchScoreBadge score={match.score} label={match.label} emoji={match.emoji} size="lg" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    Playdate Match with {activePet?.name}
                  </h3>
                  {match.sharedVibes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Shared vibes: {match.sharedVibes.map((v) => vibeConfig[v].label).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compatibility (fallback when no active pet) */}
          {!match && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold text-foreground">Compatibility</span>
                <Link to="/profile" className="text-xs text-primary hover:underline">
                  Register your pet for real scores →
                </Link>
              </div>
            </div>
          )}

          {/* Bio */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-muted-foreground mb-1">About {pet.name}</h3>
            <p className="text-foreground leading-relaxed">{pet.bio}</p>
          </div>

          {/* Fun Fact */}
          <div className="mb-4 rounded-lg bg-secondary p-3">
            <p className="text-sm font-bold text-secondary-foreground">🤪 Fun Fact</p>
            <p className="text-sm text-secondary-foreground">{pet.funFact}</p>
          </div>

          {/* Rehoming Reason */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-muted-foreground mb-1">💛 Why rehoming</h3>
            <p className="text-sm text-foreground">{pet.rehomingReason}</p>
          </div>

          {/* Actions */}
          <div className="sticky bottom-20 md:bottom-4 space-y-3">
            {/* Playdate Request */}
            {activePet && (
              existingPlaydate ? (
                <div className="text-center text-sm font-bold text-primary py-2">
                  ✅ Playdate request sent!
                </div>
              ) : (
                <Button
                  onClick={handlePlaydateRequest}
                  variant="outline"
                  className="w-full h-12 text-base font-bold rounded-xl gap-2 btn-bouncy"
                >
                  <HeartHandshake className="h-5 w-5" />
                  Request Playdate with {pet.name}
                </Button>
              )
            )}

            {/* Application Status or Apply Button */}
            {existingApp ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ClipboardList className="h-4 w-4" />
                  Your Application
                </div>
                <ApplicationStatusTracker status={existingApp.status} />
              </div>
            ) : (
              <Button onClick={() => setFormOpen(true)} className="w-full h-12 text-base font-bold rounded-xl">
                🐾 Apply to Adopt {pet.name}
              </Button>
            )}
          </div>

          {pet && <AdoptionForm pet={pet} open={formOpen} onOpenChange={setFormOpen} />}
        </div>
      </div>
    </div>
  );
};

export default PetProfile;
