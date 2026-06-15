"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";

interface UseUserResult {
  user:    User | null;
  loading: boolean;
}

/**
 * Gibt den aktuell eingeloggten Benutzer zurück.
 * Aktualisiert sich automatisch bei Auth-State-Änderungen.
 */
export function useUser(): UseUserResult {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Initialer User-Check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Auf Auth-Änderungen hören (Login, Logout, Token-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
