import { useState } from "react";
import { Pet } from "@/data/mock-pets";
import { currentUser } from "@/data/mock-users";
import { useApplications, ScreeningAnswers } from "@/context/ApplicationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

interface AdoptionFormProps {
  pet: Pet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialAnswers: ScreeningAnswers = {
  homeType: "",
  hasYard: false,
  otherPets: "",
  children: "",
  experience: "",
  hoursAlone: "",
  reason: "",
};

export function AdoptionForm({ pet, open, onOpenChange }: AdoptionFormProps) {
  const { submitApplication } = useApplications();
  const [answers, setAnswers] = useState<ScreeningAnswers>(initialAnswers);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = answers.homeType && answers.hoursAlone && answers.reason.trim().length > 0;

  const handleSubmit = () => {
    submitApplication({
      petId: pet.id,
      adopterId: currentUser.id,
      rehomerId: pet.ownerId,
      screeningAnswers: answers,
    });
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setAnswers(initialAnswers);
    }, 300);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <CheckCircle className="h-16 w-16 text-primary" />
            <DialogTitle className="text-2xl">Application Sent! 🎉</DialogTitle>
            <DialogDescription>
              Your application for <span className="font-bold">{pet.name}</span> has been submitted. The rehomer will review it and get back to you soon.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-2">Back to Profile</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to Adopt {pet.name}</DialogTitle>
          <DialogDescription>
            Answer a few screening questions so {pet.name}'s family can find the best match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Home Type */}
          <div className="space-y-1.5">
            <Label>What type of home do you live in? *</Label>
            <Select value={answers.homeType} onValueChange={(v) => setAnswers({ ...answers, homeType: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="House with yard">House with yard</SelectItem>
                <SelectItem value="House without yard">House without yard</SelectItem>
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="Farm/Rural">Farm / Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Yard */}
          <div className="flex items-center justify-between">
            <Label>Do you have a fenced yard?</Label>
            <Switch checked={answers.hasYard} onCheckedChange={(v) => setAnswers({ ...answers, hasYard: v })} />
          </div>

          {/* Other Pets */}
          <div className="space-y-1.5">
            <Label>Do you have other pets?</Label>
            <Input
              placeholder="e.g. One friendly cat"
              value={answers.otherPets}
              onChange={(e) => setAnswers({ ...answers, otherPets: e.target.value })}
              maxLength={200}
            />
          </div>

          {/* Children */}
          <div className="space-y-1.5">
            <Label>Children at home?</Label>
            <Input
              placeholder="e.g. Two kids, ages 5 and 9"
              value={answers.children}
              onChange={(e) => setAnswers({ ...answers, children: e.target.value })}
              maxLength={200}
            />
          </div>

          {/* Experience */}
          <div className="space-y-1.5">
            <Label>Pet experience</Label>
            <Input
              placeholder="e.g. Grew up with dogs, first-time cat owner"
              value={answers.experience}
              onChange={(e) => setAnswers({ ...answers, experience: e.target.value })}
              maxLength={200}
            />
          </div>

          {/* Hours Alone */}
          <div className="space-y-1.5">
            <Label>Hours pet would be alone daily *</Label>
            <Select value={answers.hoursAlone} onValueChange={(v) => setAnswers({ ...answers, hoursAlone: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0-2 hours">0–2 hours</SelectItem>
                <SelectItem value="2-4 hours">2–4 hours</SelectItem>
                <SelectItem value="4-6 hours">4–6 hours</SelectItem>
                <SelectItem value="6-8 hours">6–8 hours</SelectItem>
                <SelectItem value="8+ hours">8+ hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Why do you want to adopt {pet.name}? *</Label>
            <Textarea
              placeholder="Tell us what drew you to this pet…"
              value={answers.reason}
              onChange={(e) => setAnswers({ ...answers, reason: e.target.value })}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full h-12 text-base font-bold rounded-xl">
            🐾 Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
