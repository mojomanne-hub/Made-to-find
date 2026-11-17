/**
 * Wird sofort angezeigt, während eine Seite lädt – so reagiert die App direkt auf jeden Tipp,
 * statt bis zur fertigen Seite stehen zu bleiben.
 */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Wird geladen">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-800" />
        <div className="h-4 w-32 rounded bg-slate-800/70" />
      </div>
      <div className="h-11 w-full rounded-xl bg-slate-800/70" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-800" />
      </div>
      <div className="space-y-2">
        <div className="h-16 rounded-2xl bg-slate-800/70" />
        <div className="h-16 rounded-2xl bg-slate-800/70" />
        <div className="h-16 rounded-2xl bg-slate-800/70" />
      </div>
    </div>
  );
}
