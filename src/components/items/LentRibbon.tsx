/** Schräges „Verliehen“-Band oben links auf einer Kachel (Elternelement braucht relative + overflow-hidden) */
export function LentRibbon({ overdue = false }: { overdue?: boolean }) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-[-34px] top-[14px] w-[120px] -rotate-45 text-center text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
        style={{ backgroundColor: overdue ? "#dc2626" : "#d97706", padding: "3px 0" }}
      >
        Verliehen
      </div>
    </div>
  );
}

export function isLentOverdue(lentUntil: string | null | undefined) {
  return !!lentUntil && lentUntil < new Date().toISOString().slice(0, 10);
}
