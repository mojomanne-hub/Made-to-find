"use client";

import { useState, useEffect } from "react";

/**
 * Verzögert einen Wert um `delay` ms.
 * Ideal für Sucheingaben – verhindert zu viele API-Aufrufe.
 *
 * @param value  Der zu verzögernde Wert
 * @param delay  Verzögerung in ms (Standard: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
