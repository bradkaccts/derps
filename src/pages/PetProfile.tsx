import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, ShieldCheck } from "lucide-react";
import { mockPets } from "@/data/mock-pets";
import { vibeConfig } from "@/lib/vibes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const PetProfile = () => {
  const { id } = useParams();
  const pet = mockPets.find((p) => p.id === id);

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

  // Mock compatibility score
  const compatibilityScore = Math.floor(Math.random() * 30) + 70;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Mobile: stacked / Desktop: split */}
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
            <Button variant="ghost" size="icon">
              <Heart className="h-6 w-6 text-accent" />
            </Button>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4" />
            {pet.location} · {pet.distanceKm}km away
          </div>

          {/* Health Badge */}
          {pet.healthVerified && (
            <div className="flex items-center gap-1.5 mb-4 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Verified Health Records
            </div>
          )}

          {/* Vibes */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {pet.vibes.map((vibe) => {
              const config = vibeConfig[vibe];
              return (
                <Badge key={vibe} variant="secondary" className="gap-1 font-semibold">
                  <span>{config.icon}</span>
                  {config.label}
                </Badge>
              );
            })}
          </div>

          {/* Compatibility Meter */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-bold text-foreground">Compatibility</span>
              <span className="font-bold text-primary">{compatibilityScore}%</span>
            </div>
            <Progress value={compatibilityScore} className="h-3" />
          </div>

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

          {/* Apply Button */}
          <div className="sticky bottom-20 md:bottom-4">
            <Button className="w-full h-12 text-base font-bold rounded-xl">
              🐾 Apply to Adopt {pet.name}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetProfile;
