/**
 * Eigener Bestätigungsdialog im Stil der App – ersetzt das Browser-Fenster
 * („Auf … wird Folgendes angezeigt“) von window.confirm().
 *
 * Verwendung:  if (!(await confirmDialog({ title: "…", message: "…" }))) return;
 */
interface ConfirmOptions {
  title:         string;
  message?:      string;
  confirmLabel?: string;   // Standard: "Löschen"
  cancelLabel?:  string;   // Standard: "Abbrechen"
  danger?:       boolean;  // Standard: true (roter Button)
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const danger = opts.danger ?? true;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;" +
      "background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);";

    const box = document.createElement("div");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.style.cssText =
      "width:100%;max-width:24rem;border-radius:16px;background:#1e2a3a;border:1px solid #2d3f55;" +
      "box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);padding:20px;font-family:inherit;";

    const title = document.createElement("h2");
    title.id = "confirm-dialog-title";
    title.textContent = opts.title;
    title.style.cssText = "margin:0;font-size:16px;font-weight:600;color:#f1f5f9;line-height:1.35;overflow-wrap:anywhere;";
    box.setAttribute("aria-labelledby", title.id);
    box.appendChild(title);

    if (opts.message) {
      const msg = document.createElement("p");
      msg.textContent = opts.message;
      msg.style.cssText = "margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.5;";
      box.appendChild(msg);
    }

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;margin-top:20px;";

    const makeButton = (label: string, css: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "flex:1;min-height:44px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;" + css;
      return b;
    };
    const cancel = makeButton(opts.cancelLabel ?? "Abbrechen", "background:transparent;border:1px solid #475569;color:#e2e8f0;");
    const ok = makeButton(
      opts.confirmLabel ?? "Löschen",
      danger ? "background:#dc2626;border:1px solid #dc2626;color:#fff;" : "background:#2563eb;border:1px solid #2563eb;color:#fff;"
    );
    row.append(cancel, ok);
    box.appendChild(row);
    overlay.appendChild(box);

    const prevOverflow = document.body.style.overflow;
    function finish(result: boolean) {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      overlay.remove();
      previouslyFocused?.focus?.();
      resolve(result);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
      if (e.key === "Tab") {             // Fokus bleibt im Dialog
        e.preventDefault();
        (document.activeElement === cancel ? ok : cancel).focus();
      }
    }

    cancel.addEventListener("click", () => finish(false));
    ok.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(false); });
    document.addEventListener("keydown", onKey, true);

    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);
    cancel.focus();                      // sicherer Standard: Enter bricht ab
  });
}
