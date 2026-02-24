import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Species, type VibeTag, type AgeCategory } from "@/data/mock-pets";
import { vibeConfig, allVibes } from "@/lib/vibes";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STEPS = ["Basics", "Vibes", "Photos", "Rehoming", "Review"] as const;
type Step = (typeof STEPS)[number];

interface ListingDraft {
  name: string;
  species: Species | "";
  breed: string;
  age: string;
  ageCategory: AgeCategory | "";
  gender: "male" | "female" | "";
  adoptionFee: string;
  vibes: VibeTag[];
  photos: string[];
  rehomingReason: string;
  rehomingCategory: string;
  bio: string;
}

const emptyDraft: ListingDraft = {
  name: "",
  species: "",
  breed: "",
  age: "",
  ageCategory: "",
  gender: "",
  adoptionFee: "",
  vibes: [],
  photos: [],
  rehomingReason: "",
  rehomingCategory: "",
  bio: "",
};

const speciesOptions: { value: Species; label: string; emoji: string }[] = [
  { value: "dog", label: "Dog", emoji: "🐕" },
  { value: "cat", label: "Cat", emoji: "🐈" },
  { value: "bird", label: "Bird", emoji: "🦜" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "small-animal", label: "Small Animal", emoji: "🐰" },
];

const ageCategories: { value: AgeCategory; label: string }[] = [
  { value: "baby", label: "Baby (< 1 year)" },
  { value: "young", label: "Young (1-3 years)" },
  { value: "adult", label: "Adult (3-7 years)" },
  { value: "senior", label: "Senior (7+ years)" },
];

const rehomingCategories = [
  { value: "relocating", label: "Relocating / Moving", emoji: "🏠" },
  { value: "health", label: "Health Changes", emoji: "💛" },
  { value: "allergies", label: "Allergies", emoji: "🤧" },
  { value: "lifestyle", label: "Lifestyle Change", emoji: "🔄" },
  { value: "space", label: "Need More Space", emoji: "📐" },
  { value: "financial", label: "Financial Reasons", emoji: "💰" },
  { value: "other", label: "Other", emoji: "📝" },
];

// Mock photo URLs for "uploaded" photos
const mockPhotoPool = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1504450874802-0ba2bcd659e3?w=600&h=600&fit=crop",
];

const mockBios = [
  "is the kind of companion who'll make every day brighter. Equal parts goofy and loving, they've mastered the art of the head tilt and the guilt-trip stare. A true professional snuggler with a PhD in treat negotiation.",
  "brings chaos and cuddles in equal measure. They'll steal your socks, hog the couch, and then look at you with those big eyes like they've done nothing wrong. You'll love every second of it.",
  "is basically a furry therapist — always there when you need a hug, never judges your Netflix choices, and thinks you're the most interesting human alive. What more could you ask for?",
];

const CreateListing = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);

  const update = (partial: Partial<ListingDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const stepProgress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!(draft.name && draft.species && draft.breed && draft.age && draft.ageCategory && draft.gender);
      case 1:
        return draft.vibes.length >= 1;
      case 2:
        return draft.photos.length >= 1;
      case 3:
        return !!(draft.rehomingCategory && draft.bio);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handlePublish = () => {
    toast({
      title: "🎉 Listing Published!",
      description: `${draft.name} is now live and ready to find their new family!`,
    });
    navigate("/");
  };

  const generateBio = () => {
    const randomBio = mockBios[Math.floor(Math.random() * mockBios.length)];
    update({ bio: `${draft.name || "This little one"} ${randomBio}` });
  };

  const addMockPhoto = () => {
    const available = mockPhotoPool.filter((p) => !draft.photos.includes(p));
    if (available.length > 0) {
      update({ photos: [...draft.photos, available[Math.floor(Math.random() * available.length)]] });
    }
  };

  const removePhoto = (url: string) => {
    update({ photos: draft.photos.filter((p) => p !== url) });
  };

  const toggleVibe = (vibe: VibeTag) => {
    update({
      vibes: draft.vibes.includes(vibe)
        ? draft.vibes.filter((v) => v !== vibe)
        : [...draft.vibes, vibe],
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
          🐾 List a Derp for Rehoming
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
        </p>
        <Progress value={stepProgress} className="h-2 mt-3" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((step, i) => (
          <button
            key={step}
            onClick={() => i < currentStep && setCurrentStep(i)}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all shrink-0",
              i === currentStep
                ? "bg-primary text-primary-foreground"
                : i < currentStep
                ? "bg-primary/20 text-primary cursor-pointer"
                : "bg-muted text-muted-foreground"
            )}
          >
            {i < currentStep ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{step}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <StepBasics draft={draft} update={update} />
          )}
          {currentStep === 1 && (
            <StepVibes draft={draft} toggleVibe={toggleVibe} />
          )}
          {currentStep === 2 && (
            <StepPhotos draft={draft} addMockPhoto={addMockPhoto} removePhoto={removePhoto} />
          )}
          {currentStep === 3 && (
            <StepRehoming draft={draft} update={update} generateBio={generateBio} />
          )}
          {currentStep === 4 && (
            <StepReview draft={draft} />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handlePublish} className="gap-1">
            <Check className="h-4 w-4" /> Publish Listing
          </Button>
        )}
      </div>
    </div>
  );
};

/* ── Step Components ── */

function StepBasics({ draft, update }: { draft: ListingDraft; update: (p: Partial<ListingDraft>) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Species & Basics</h2>
      <p className="text-sm text-muted-foreground">Tell us about your pet's basics.</p>

      <div>
        <Label className="text-sm font-semibold">Pet Name</Label>
        <Input placeholder="e.g. Biscuit" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
      </div>

      <div>
        <Label className="text-sm font-semibold">Species</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {speciesOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ species: opt.value })}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all border",
                draft.species === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              )}
            >
              <span>{opt.emoji}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Breed / Type</Label>
          <Input placeholder="e.g. Golden Retriever" value={draft.breed} onChange={(e) => update({ breed: e.target.value })} />
        </div>
        <div>
          <Label className="text-sm font-semibold">Age</Label>
          <Input placeholder="e.g. 3 years" value={draft.age} onChange={(e) => update({ age: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Age Category</Label>
          <Select value={draft.ageCategory} onValueChange={(v) => update({ ageCategory: v as AgeCategory })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {ageCategories.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-semibold">Gender</Label>
          <div className="flex gap-2 mt-1">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => update({ gender: g })}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold border transition-all",
                  draft.gender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                )}
              >
                {g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Adoption Fee ($)</Label>
        <Input type="number" placeholder="0" min="0" value={draft.adoptionFee} onChange={(e) => update({ adoptionFee: e.target.value })} />
      </div>
    </div>
  );
}

function StepVibes({ draft, toggleVibe }: { draft: ListingDraft; toggleVibe: (v: VibeTag) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">✨ Personality Vibes</h2>
      <p className="text-sm text-muted-foreground">
        Select all the vibes that match {draft.name || "your pet"}'s personality. Pick at least one!
      </p>
      <div className="grid grid-cols-2 gap-2">
        {allVibes.map((vibe) => {
          const config = vibeConfig[vibe];
          const active = draft.vibes.includes(vibe);
          return (
            <button
              key={vibe}
              onClick={() => toggleVibe(vibe)}
              className={cn(
                "flex items-center gap-2 rounded-xl p-3 text-sm font-semibold border transition-all text-left",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{config.icon}</span>
              {config.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {draft.vibes.length} vibe{draft.vibes.length !== 1 ? "s" : ""} selected
      </p>
    </div>
  );
}

function StepPhotos({ draft, addMockPhoto, removePhoto }: { draft: ListingDraft; addMockPhoto: () => void; removePhoto: (url: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">📸 Photos</h2>
      <p className="text-sm text-muted-foreground">
        Add at least one photo of {draft.name || "your pet"}. The first photo will be the main listing photo.
      </p>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {draft.photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group">
            <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                Main
              </span>
            )}
            <button
              onClick={() => removePhoto(photo)}
              className="absolute top-1 right-1 rounded-full bg-destructive/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-destructive-foreground" />
            </button>
          </div>
        ))}
        {draft.photos.length < 6 && (
          <button
            onClick={addMockPhoto}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">Add Photo</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {draft.photos.length}/6 photos · In MVP, photos are simulated
      </p>
    </div>
  );
}

function StepRehoming({ draft, update, generateBio }: { draft: ListingDraft; update: (p: Partial<ListingDraft>) => void; generateBio: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">💛 Rehoming Details</h2>
      <p className="text-sm text-muted-foreground">
        Help adopters understand your situation. This is shown empathetically.
      </p>

      <div>
        <Label className="text-sm font-semibold">Reason for rehoming</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {rehomingCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => update({ rehomingCategory: cat.value })}
              className={cn(
                "flex items-center gap-2 rounded-xl p-3 text-sm font-semibold border transition-all text-left",
                draft.rehomingCategory === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              )}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Additional details (optional)</Label>
        <Textarea
          placeholder="Share a bit more about why you're rehoming, if you'd like..."
          value={draft.rehomingReason}
          onChange={(e) => update({ rehomingReason: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-semibold">Pet Bio</Label>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={generateBio}>
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </Button>
        </div>
        <Textarea
          placeholder={`Tell adopters about ${draft.name || "your pet"}'s personality, quirks, and what makes them special...`}
          value={draft.bio}
          onChange={(e) => update({ bio: e.target.value })}
          rows={5}
        />
      </div>
    </div>
  );
}

function StepReview({ draft }: { draft: ListingDraft }) {
  const speciesLabel = speciesOptions.find((s) => s.value === draft.species);
  const categoryLabel = rehomingCategories.find((c) => c.value === draft.rehomingCategory);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">📋 Review Your Listing</h2>
      <p className="text-sm text-muted-foreground">
        Make sure everything looks good before publishing!
      </p>

      {/* Photo preview */}
      {draft.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {draft.photos.map((p, i) => (
            <img key={i} src={p} alt="" className="h-24 w-24 rounded-xl object-cover shrink-0 border-2 border-border" />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="space-y-2">
        <ReviewRow label="Name" value={draft.name} />
        <ReviewRow label="Species" value={`${speciesLabel?.emoji ?? ""} ${speciesLabel?.label ?? draft.species}`} />
        <ReviewRow label="Breed" value={draft.breed} />
        <ReviewRow label="Age" value={draft.age} />
        <ReviewRow label="Gender" value={draft.gender === "male" ? "♂ Male" : "♀ Female"} />
        <ReviewRow label="Adoption Fee" value={draft.adoptionFee ? `$${draft.adoptionFee}` : "Free"} />
        <ReviewRow label="Rehoming Reason" value={`${categoryLabel?.emoji ?? ""} ${categoryLabel?.label ?? ""}`} />
      </div>

      {/* Vibes */}
      <div>
        <span className="text-sm text-muted-foreground">Vibes</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {draft.vibes.map((vibe) => {
            const config = vibeConfig[vibe];
            return (
              <Badge key={vibe} variant="secondary" className="gap-1 font-semibold">
                <span>{config.icon}</span> {config.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Bio */}
      {draft.bio && (
        <div>
          <span className="text-sm text-muted-foreground">Bio</span>
          <p className="text-sm text-foreground mt-1 leading-relaxed">{draft.bio}</p>
        </div>
      )}

      {draft.rehomingReason && (
        <div>
          <span className="text-sm text-muted-foreground">Additional Details</span>
          <p className="text-sm text-foreground mt-1">{draft.rehomingReason}</p>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default CreateListing;
