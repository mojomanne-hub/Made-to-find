"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { OnboardingModal }     from "@/components/onboarding/OnboardingModal";

export function OnboardingWrapper() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked,        setChecked]        = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecked(true); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.onboarding_completed) {
        setShowOnboarding(true);
      }
      setChecked(true);
    }
    checkOnboarding();
  }, []);

  if (!checked || !showOnboarding) return null;

  return (
    <OnboardingModal
      onComplete={() => setShowOnboarding(false)}
    />
  );
}
