"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const GUARD = "__mtfBackGuard";
const APP_PREFIXES = ["/dashboard", "/items", "/locations", "/search", "/settings"];

function isAppPath(path: string) {
  return APP_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

/** Nächsthöhere Ebene zu einem Pfad – oder null, wenn es keine gibt (Übersicht = oberste Ebene) */
export function parentPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard" || path === "/") return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "/dashboard";
  return "/" + parts.slice(0, -1).join("/");
}

/**
 * Zurück-Taste am Handy: springt eine Ebene nach oben (Gegenstand → Gegenstände → Übersicht),
 * statt jeden einzelnen Schritt rückwärts abzuspielen. Auf der Übersicht verlässt „Zurück“ die App.
 *
 * Funktionsweise:
 *  1. Tippen auf Links innerhalb der App ersetzt den Verlaufseintrag, statt einen neuen anzuhängen.
 *  2. Auf jeder Unterseite liegt ein zusätzlicher „Wächter“-Eintrag obenauf. Die Zurück-Taste nimmt
 *     nur diesen weg; darauf wechseln wir zur übergeordneten Seite.
 *  3. Auf der Übersicht fragt der erste Druck nach („Zum Beenden noch einmal Zurück drücken“),
 *     der zweite innerhalb von 2,5 Sekunden verlässt die App.
 * Nur auf Touch-Geräten aktiv – am PC bleibt der Browser-Verlauf wie gewohnt.
 */
export function BackNavigation() {
  const pathname = usePathname();
  const router   = useRouter();
  const pathRef    = useRef(pathname);                 // Seite, auf der wir gerade sind
  const baseRef    = useRef(false);                    // liegt unter der aktuellen Seite ein Eintrag, den „Zurück“ abfangen kann?
  const expectRef  = useRef<string | null>(null);      // Seite, auf der nach einem Zurück-Schritt ein Wächter fällig ist
  const skipRef    = useRef(false);                    // true, während wir selbst im Verlauf springen
  const startedRef = useRef(false);
  const armedRef   = useRef(false);                    // „Zum Beenden erneut drücken“ ist gerade aktiv
  const armTimer   = useRef<number | null>(null);

  /** Kurzer Hinweis am unteren Rand (wie bei Android-Apps üblich) */
  function showExitHint() {
    document.getElementById("mtf-exit-hint")?.remove();
    const el = document.createElement("div");
    el.id = "mtf-exit-hint";
    el.setAttribute("role", "status");
    el.textContent = "Zum Beenden noch einmal „Zurück“ drücken";
    el.style.cssText =
      "position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1000;" +
      "max-width:calc(100vw - 32px);padding:10px 16px;border-radius:999px;background:#1e2a3a;border:1px solid #2d3f55;" +
      "color:#f1f5f9;font-size:14px;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,0.45);white-space:nowrap;";
    document.body.appendChild(el);
  }
  function disarm() {
    armedRef.current = false;
    if (armTimer.current) { window.clearTimeout(armTimer.current); armTimer.current = null; }
    document.getElementById("mtf-exit-hint")?.remove();
  }
  /** Erster Druck auf der Übersicht: Hinweis zeigen; der zweite Druck innerhalb von 2,5 s verlässt die App */
  function armExit() {
    armedRef.current = true;
    baseRef.current = false;
    showExitHint();
    armTimer.current = window.setTimeout(() => {
      disarm();
      if (!parentPath(pathRef.current)) pushGuard();       // noch auf der Übersicht → wieder absichern
    }, 2500);
  }

  function pushGuard() {
    const current = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.pushState({ ...current, [GUARD]: true }, "", window.location.href);
    baseRef.current = true;
  }

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    // 1) Link-Klicks: ab der zweiten Ebene ersetzen statt anhängen
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin || !isAppPath(url.pathname)) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) { e.preventDefault(); return; }
      expectRef.current = null;
      disarm();
      if (!baseRef.current) {
        // Von der obersten Ebene aus: normal anhängen – der Eintrag darunter fängt später „Zurück“ ab
        if (parentPath(url.pathname)) baseRef.current = true;
        return;
      }
      e.preventDefault();
      router.replace(url.pathname + url.search + url.hash);
    }

    // 2) Zurück-Taste
    function onPop() {
      if (skipRef.current) return;
      const parent = parentPath(pathRef.current);
      if (parent) expectRef.current = parent;                // auch die Übersicht bekommt einen Wächter (für die Beenden-Abfrage)
      // kurz warten, bis Next.js seinen eigenen Zurück-Schritt verarbeitet hat
      window.setTimeout(() => {
        if (parent) { router.replace(parent); return; }
        // „Zurück“ auf der Übersicht: erst nachfragen. Dazu alle alten Einträge überspringen, damit der
        // zweite Druck die App wirklich verlässt.
        const nav = (window as unknown as { navigation?: { currentEntry?: { index: number } } }).navigation;
        const index = nav?.currentEntry?.index ?? 0;
        if (index > 0) {
          skipRef.current = true;
          window.history.go(-index);
          window.setTimeout(() => { skipRef.current = false; router.replace("/dashboard"); armExit(); }, 200);
        } else {
          router.replace("/dashboard");
          armExit();
        }
      }, 0);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      disarm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Wächter-Eintrag: beim Start auf einer Unterseite und nach jedem Zurück-Schritt auf eine Unterseite
  useEffect(() => {
    pathRef.current = pathname;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const firstRun = !startedRef.current;
    startedRef.current = true;
    const due = firstRun || expectRef.current === pathname;
    if (!due) return;
    expectRef.current = null;
    const id = window.setTimeout(pushGuard, 80);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
