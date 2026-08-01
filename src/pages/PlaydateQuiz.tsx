import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { QuizFlow } from "@/components/playdates/QuizFlow";
import { VibeCardView } from "@/components/playdates/VibeCardView";
import { useMyPets } from "@/context/MyPetsContext";
import { usePetPersonality } from "@/context/playdates/PlaydatesProvider";

/**
 * Phase 1 — Know. The quiz can be user-tested standalone before any matching
 * exists (§15), which is exactly why it lives on its own route.
 */
const PlaydateQuiz = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { myPets } = useMyPets();
  const { getPersonality, isComplete, retakeQuiz } = usePetPersonality();

  const pet = myPets.find((p) => p.id === petId);
  const [showResult, setShowResult] = useState(() => (petId ? isComplete(petId) : false));

  if (!pet || !petId) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <DerpyEmpty
          title="We couldn't find that pet"
          message="Pick one of your pets from your profile and we'll get their quiz started."
          emoji="🔍"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/profile">Go to my profile →</Link>
          </Button>
        </DerpyEmpty>
      </div>
    );
  }

  const personality = getPersonality(petId);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Button
        asChild
        variant="ghost"
        className="mb-4 min-h-[44px] gap-1.5 font-semibold text-muted-foreground"
      >
        <Link to="/playdates">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Derpdates
        </Link>
      </Button>

      {showResult && personality ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">
              {pet.name}'s Vibe Card
            </h1>
            <p className="text-sm text-muted-foreground">
              This is what we'll use to find playmates — and what we'll show them about {pet.name}.
            </p>
          </div>

          <VibeCardView
            petName={pet.name}
            petPhoto={pet.photos[0]}
            personality={personality}
            onRetake={() => {
              retakeQuiz(petId);
              setShowResult(false);
            }}
          />

          <Button
            className="btn-bouncy w-full font-bold"
            onClick={() => navigate("/playdates")}
          >
            Find {pet.name} some friends →
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">
              All about {pet.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              We ask what {pet.name} <em>does</em>, not what breed they are. Breed is a terrible
              predictor of who a dog gets on with; behaviour isn't.
            </p>
          </div>

          <QuizFlow petId={petId} petName={pet.name} onComplete={() => setShowResult(true)} />
        </div>
      )}
    </div>
  );
};

export default PlaydateQuiz;
