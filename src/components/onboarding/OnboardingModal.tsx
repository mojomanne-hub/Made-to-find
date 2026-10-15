"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Package, Users, Search, ArrowRight, Check } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  onComplete: () => void;
}

interface Step {
  icon:        typeof MapPin | null;
  title:       string;
  description: string;
  color:       string;
  /** Screenshot aus /public/onboarding/ (optional – ohne Datei wird das Icon gezeigt) */
  image?:      string;
  /** Kurzes Video (mp4/webm) aus /public/onboarding/ (optional, hat Vorrang vor image) */
  video?:      string;
  /** Kurze Anleitung in 2–3 Schritten */
  howTo?:      string[];
}

const STEPS: Step[] = [
  {
    icon: null,
    title: "Willkommen bei\nMaDe to find!",
    description: "Wer kennt es nicht — man sucht ständig Dinge und findet sie nicht mehr wieder. Damit ist jetzt Schluss!",
    color: "#2563eb",
  },
  {
    icon: MapPin,
    title: "Ablageorte erstellen",
    description: "Erstelle Orte wie Keller, Garage oder Dachboden. Mit Farbe, Icon oder Foto erkennst du alles auf einen Blick.",
    color: "#10b981",
    image: "/onboarding/ablageorte.png",
    howTo: [
      "Öffne „Ablageorte“ in der Leiste",
      "Tippe auf „+“ und gib einen Namen ein",
      "Wähle Farbe, Icon oder Foto aus",
    ],
  },
  {
    icon: Package,
    title: "Gegenstände hinzufügen",
    description: "Füge Gegenstände hinzu und weise sie einem Ablageort zu. Optional mit Menge, Beschreibung und Ablaufdatum.",
    color: "#8b5cf6",
    image: "/onboarding/gegenstaende.png",
    howTo: [
      "Öffne „Gegenstände“ und tippe auf „+“",
      "Gib Namen und Ablageort an",
      "Optional: Menge, Beschreibung, Ablaufdatum",
    ],
  },
  {
    icon: Search,
    title: "Alles sofort finden",
    description: "Suche nach jedem Gegenstand und sieh sofort wo er liegt. Nie wieder suchen!",
    color: "#f59e0b",
    image: "/onboarding/suche.png",
    howTo: [
      "Öffne die Suche",
      "Tippe den Namen des Gegenstands ein",
      "Du siehst sofort, wo er liegt",
    ],
  },
  {
    icon: Users,
    title: "Gemeinsam organisieren",
    description: "Teile deine Ablageorte mit Familie, Mitbewohnern oder Vereinsmitgliedern. Alle sehen dasselbe — keine Missverständnisse mehr.",
    color: "#ec4899",
    image: "/onboarding/gruppe.png",
    howTo: [
      "Tippe oben auf das Gruppen-Menü und wähle „Gruppe erstellen“",
      "Teile den Einladungslink per WhatsApp oder E-Mail",
      "Wer den Link bestätigt, tritt der Gruppe bei",
    ],
  },
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step,      setStep]      = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // Schritte, deren Bild/Video nicht geladen werden konnte, zeigen wieder das Icon
  const [mediaFailed, setMediaFailed] = useState<Record<number, boolean>>({});

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

  const Icon     = current.icon;
  const hasMedia = !!(current.video || current.image) && !mediaFailed[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        {/* Farbiger Header */}
        <div
          className={cn(
            "flex flex-col items-center justify-center relative transition-all duration-500",
            hasMedia ? "pt-6 pb-10" : "h-48"
          )}
          style={{ backgroundColor: current.color }}
        >
          {/* Dezenter Glow */}
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(circle at 50% 0%, #ffffff, transparent 70%)" }} />

          {hasMedia ? (
            /* Screenshot / Video im Handy-Rahmen */
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl bg-black"
              style={{ border: "4px solid rgba(0,0,0,0.55)", width: 140, height: 300 }}
            >
              {current.video ? (
                <video
                  key={current.video}
                  src={current.video}
                  autoPlay loop muted playsInline
                  onError={() => setMediaFailed((m) => ({ ...m, [step]: true }))}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={current.image}
                  src={current.image}
                  alt={current.title.replace("\n", " ")}
                  onError={() => setMediaFailed((m) => ({ ...m, [step]: true }))}
                  className="h-full w-full object-cover object-top"
                />
              )}
            </div>
          ) : isFirst ? (
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
        <div className="p-6 pt-5">
          <h2 className="text-xl font-bold text-white text-center whitespace-pre-line mb-3">
            {current.title}
          </h2>
          <p className="text-sm text-slate-400 text-center leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Kurze Anleitung */}
          {current.howTo && (
            <ol className="mb-6 space-y-2 rounded-2xl px-4 py-3" style={{ backgroundColor: "#0f1729", border: "1px solid #2d3f55" }}>
              {current.howTo.map((text, i) => (
                <li key={text} className="flex items-start gap-2.5 text-left">
                  <span
                    className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                    style={{ backgroundColor: current.color }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-300 leading-snug">{text}</span>
                </li>
              ))}
            </ol>
          )}

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
