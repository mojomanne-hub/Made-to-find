"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Package, Users, Search, ArrowRight, Check } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: null,
    title: "Willkommen bei\nMaDe to find!",
    description: "Wer kennt es nicht — man sucht ständig Dinge und findet sie nicht mehr wieder. Damit ist jetzt Schluss!",
    color: "#2563eb",
  },
  {
    icon: MapPin,
    title: "Ablageorte erstellen",
    description: "Erstelle Orte wie Keller, Garage oder Dachboden. Mit Farbe und Icon erkennst du alles auf einen Blick.",
    color: "#10b981",
  },
  {
    icon: Package,
    title: "Gegenstände hinzufügen",
    description: "Füge Gegenstände hinzu und weise sie einem Ablageort zu. Optional mit Menge, Beschreibung und Ablaufdatum.",
    color: "#8b5cf6",
  },
  {
    icon: Search,
    title: "Alles sofort finden",
    description: "Suche nach jedem Gegenstand und sieh sofort wo er liegt. Nie wieder suchen!",
    color: "#f59e0b",
  },
  {
    icon: Users,
    title: "Gemeinsam organisieren",
    description: "Teile deine Ablageorte mit Familie, Mitbewohnern oder Vereinsmitgliedern. Alle sehen dasselbe — keine Missverständnisse mehr.",
    color: "#ec4899",
  },
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step,      setStep]      = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const current   = STEPS[step];
  const isLast    = step === STEPS.length - 1;
  const isFirst   = step === 0;

  async function handleComplete() {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      }
    } finally {
      setIsLoading(false);
      onComplete();
    }
  }

  function handleNext() {
    if (isLast) {
      handleComplete();
    } else {
      setStep((v) => v + 1);
    }
  }

  function handleSkip() {
    handleComplete();
  }

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        {/* Farbiger Header */}
        <div
          className="h-48 flex flex-col items-center justify-center relative transition-colors duration-500"
          style={{ backgroundColor: current.color }}
        >
          {/* Dezenter Glow */}
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(circle at 50% 0%, #ffffff, transparent 70%)" }} />

          {isFirst ? (
            /* Erster Schritt — Logo */
            <div className="flex flex-col items-center gap-3 relative">
              <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-2xl">
                <Image src="/icons/icon-192x192.png" alt="MaDe to find" width={80} height={80} />
              </div>
              <p className="text-white/80 text-sm font-medium tracking-wide">MaDe to find</p>
            </div>
          ) : Icon ? (
            /* Andere Schritte — Icon */
            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
                <Icon className="h-12 w-12 text-white" />
              </div>
            </div>
          ) : null}

          {/* Step Dots */}
          <div className="absolute bottom-4 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === step ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-white text-center whitespace-pre-line mb-3">
            {current.title}
          </h2>
          <p className="text-sm text-slate-400 text-center leading-relaxed mb-6">
            {current.description}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            {!isFirst && (
              <button
                onClick={() => setStep((v) => v - 1)}
                className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Zurück
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: current.color }}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : isLast ? (
                <><Check className="h-4 w-4" /> Los geht&apos;s!</>
              ) : (
                <>Weiter <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
