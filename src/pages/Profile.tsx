import { useState } from "react";
import { currentUser } from "@/data/mock-users";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ShieldCheck, RotateCcw, SlidersHorizontal, PawPrint, X, Plus } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useMyPets, type MyPet } from "@/context/MyPetsContext";
import { type Species, type VibeTag, type AgeCategory } from "@/data/mock-pets";
import { vibeConfig, allVibes } from "@/lib/vibes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const speciesOptions: { value: Species; label: string; emoji: string }[] = [
  { value: "dog", label: "Dogs", emoji: "🐕" },
  { value: "cat", label: "Cats", emoji: "🐈" },
  { value: "bird", label: "Birds", emoji: "🦜" },
  { value: "reptile", label: "Reptiles", emoji: "🦎" },
  { value: "small-animal", label: "Small Animals", emoji: "🐰" },
];

const ageOptions: { value: AgeCategory; label: string; emoji: string }[] = [
  { value: "baby", label: "Baby", emoji: "🍼" },
  { value: "young", label: "Young", emoji: "🌱" },
  { value: "adult", label: "Adult", emoji: "🌿" },
  { value: "senior", label: "Senior", emoji: "🌳" },
];

const genderOptions: { value: "male" | "female"; label: string; emoji: string }[] = [
  { value: "male", label: "Male", emoji: "♂" },
  { value: "female", label: "Female", emoji: "♀" },
];

function ToggleChip({
  label,
  emoji,
  active,
  onToggle,
  variant = "include",
}: {
  label: string;
  emoji: string;
  active: boolean;
  onToggle: () => void;
  variant?: "include" | "exclude";
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all border",
        active && variant === "include"
          ? "bg-primary text-primary-foreground border-primary"
          : active && variant === "exclude"
          ? "bg-destructive text-destructive-foreground border-destructive"
          : "bg-card text-foreground border-border hover:border-primary/50"
      )}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

const Profile = () => {
  const { preferences, updatePreferences, resetPreferences, activeFilterCount } =
    usePreferences();
  const { myPets, activePet, setActivePetId, addMyPet, removeMyPet } = useMyPets();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<Species>("dog");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetAge, setNewPetAge] = useState<AgeCategory>("adult");
  const [newPetVibes, setNewPetVibes] = useState<VibeTag[]>([]);

  const handleAddPet = () => {
    if (!newPetName.trim()) {
      toast.error("Give your pet a name!");
      return;
    }
    addMyPet({
      name: newPetName.trim(),
      species: newPetSpecies,
      breed: newPetBreed.trim() || "Mixed",
      age: ageOptions.find((a) => a.value === newPetAge)?.label + " " + newPetSpecies || "",
      ageCategory: newPetAge,
      gender: "male",
      vibes: newPetVibes.length > 0 ? newPetVibes : ["playful"],
      bio: "",
      funFact: "",
      location: currentUser.location,
      distanceKm: 0,
      photos: ["https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop"],
      healthVerified: true,
    });
    toast.success(`${newPetName} added! Now find them some friends 🐾`);
    setShowAddForm(false);
    setNewPetName("");
    setNewPetBreed("");
    setNewPetVibes([]);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="h-16 w-16 rounded-full object-cover border-2 border-primary"
        />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{currentUser.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize font-semibold">
              {currentUser.role}
            </Badge>
            {currentUser.verified && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="font-semibold text-foreground">{currentUser.location}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Home</span>
            <span className="font-semibold text-foreground">{currentUser.homeType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Family Size</span>
            <span className="font-semibold text-foreground">{currentUser.familySize}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Yard</span>
            <span className="font-semibold text-foreground">
              {currentUser.hasYard ? "Yes 🌿" : "No"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trust Score</span>
            <span className="font-bold text-primary">{currentUser.trustScore}/100</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* My Pets / Derpdates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <PawPrint className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold text-foreground">Your Derps</h2>
          <Badge variant="secondary" className="text-xs">{myPets.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Register your pets to find derpdate matches! The active pet is used for compatibility scoring.
        </p>

        {/* Pet list */}
        <div className="space-y-2 mb-4">
          {myPets.map((pet) => (
            <div
              key={pet.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                activePet?.id === pet.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
              onClick={() => setActivePetId(pet.id)}
            >
              <img src={pet.photos[0]} alt={pet.name} className="h-12 w-12 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{pet.name}</span>
                  {activePet?.id === pet.id && (
                    <Badge variant="default" className="text-[10px] px-1.5">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {pet.breed} · {pet.vibes.slice(0, 2).map((v) => vibeConfig[v]?.icon).join(" ")}
                </p>
              </div>
              {myPets.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMyPet(pet.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add pet form */}
        {showAddForm ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-foreground text-sm">Add a new derp</h3>
              <Input
                placeholder="Pet name"
                value={newPetName}
                onChange={(e) => setNewPetName(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {speciesOptions.map((opt) => (
                  <ToggleChip
                    key={opt.value}
                    label={opt.label}
                    emoji={opt.emoji}
                    active={newPetSpecies === opt.value}
                    onToggle={() => setNewPetSpecies(opt.value)}
                  />
                ))}
              </div>
              <Input
                placeholder="Breed (optional)"
                value={newPetBreed}
                onChange={(e) => setNewPetBreed(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {ageOptions.map((opt) => (
                  <ToggleChip
                    key={opt.value}
                    label={opt.label}
                    emoji={opt.emoji}
                    active={newPetAge === opt.value}
                    onToggle={() => setNewPetAge(opt.value)}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-muted-foreground">Vibes</p>
              <div className="flex flex-wrap gap-2">
                {allVibes.map((vibe) => (
                  <ToggleChip
                    key={vibe}
                    label={vibeConfig[vibe].label}
                    emoji={vibeConfig[vibe].icon}
                    active={newPetVibes.includes(vibe)}
                    onToggle={() => setNewPetVibes(toggleInArray(newPetVibes, vibe))}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPet} className="flex-1 font-bold">
                  Add Pet
                </Button>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 font-semibold"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add Another Pet
          </Button>
        )}
      </div>

      <Separator />

      {/* Preferences Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-extrabold text-foreground">My Preferences</h2>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={resetPreferences}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Set your preferences to pre-filter your discovery feed. Only matching derps will appear!
        </p>
      </div>

      {/* Species */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🐾 Species I'm interested in</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {speciesOptions.map((opt) => (
              <ToggleChip
                key={opt.value}
                label={opt.label}
                emoji={opt.emoji}
                active={preferences.species.includes(opt.value)}
                onToggle={() =>
                  updatePreferences({
                    species: toggleInArray(preferences.species, opt.value),
                  })
                }
              />
            ))}
          </div>
          {preferences.species.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              None selected = showing all species
            </p>
          )}
        </CardContent>
      </Card>

      {/* Age */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🎂 Age preference</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {ageOptions.map((opt) => (
              <ToggleChip
                key={opt.value}
                label={opt.label}
                emoji={opt.emoji}
                active={preferences.ageCategories.includes(opt.value)}
                onToggle={() =>
                  updatePreferences({
                    ageCategories: toggleInArray(preferences.ageCategories, opt.value),
                  })
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gender */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">⚧ Gender preference</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {genderOptions.map((opt) => (
              <ToggleChip
                key={opt.value}
                label={opt.label}
                emoji={opt.emoji}
                active={preferences.genders.includes(opt.value)}
                onToggle={() =>
                  updatePreferences({
                    genders: toggleInArray(preferences.genders, opt.value),
                  })
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vibes I want */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">✨ Vibes I'm looking for</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {allVibes.map((vibe) => {
              const config = vibeConfig[vibe];
              return (
                <ToggleChip
                  key={vibe}
                  label={config.label}
                  emoji={config.icon}
                  active={preferences.vibesWanted.includes(vibe)}
                  onToggle={() =>
                    updatePreferences({
                      vibesWanted: toggleInArray(preferences.vibesWanted, vibe),
                      vibesExcluded: preferences.vibesExcluded.filter((v) => v !== vibe),
                    })
                  }
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pets must match at least one selected vibe
          </p>
        </CardContent>
      </Card>

      {/* Vibes to exclude */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🚫 Vibes I want to avoid</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {allVibes.map((vibe) => {
              const config = vibeConfig[vibe];
              return (
                <ToggleChip
                  key={vibe}
                  label={config.label}
                  emoji={config.icon}
                  active={preferences.vibesExcluded.includes(vibe)}
                  variant="exclude"
                  onToggle={() =>
                    updatePreferences({
                      vibesExcluded: toggleInArray(preferences.vibesExcluded, vibe),
                      vibesWanted: preferences.vibesWanted.filter((v) => v !== vibe),
                    })
                  }
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pets with any of these vibes will be hidden
          </p>
        </CardContent>
      </Card>

      {/* Max Adoption Fee — hidden while the app is Derpdates-first */}
      {FEATURES.adoption && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💰 Max adoption fee</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Up to</span>
            <span className="text-lg font-bold text-foreground">
              ${preferences.maxAdoptionFee}
            </span>
          </div>
          <Slider
            value={[preferences.maxAdoptionFee]}
            onValueChange={([v]) => updatePreferences({ maxAdoptionFee: v })}
            min={0}
            max={500}
            step={25}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>$500</span>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Max Distance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📍 Max distance</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Within</span>
            <span className="text-lg font-bold text-foreground">
              {preferences.maxDistanceKm}km
            </span>
          </div>
          <Slider
            value={[preferences.maxDistanceKm]}
            onValueChange={([v]) => updatePreferences({ maxDistanceKm: v })}
            min={5}
            max={50}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5km</span>
            <span>50km</span>
          </div>
        </CardContent>
      </Card>

      {/* Health Verified Only */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-sm font-bold">Verified health only</Label>
                <p className="text-xs text-muted-foreground">
                  Only show pets with verified health records
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.healthVerifiedOnly}
              onCheckedChange={(checked) =>
                updatePreferences({ healthVerifiedOnly: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
