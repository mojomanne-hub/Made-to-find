/** Schräges „Verliehen“-Band oben links auf einer Kachel (Elternelement braucht relative + overflow-hidden) */
export function LentRibbon({ overdue = false, size = "md" }: { overdue?: boolean; size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <div className={sm ? "pointer-events-none absolute left-0 top-0 z-10 h-14 w-14 overflow-hidden" : "pointer-events-none absolute left-0 top-0 z-10 h-20 w-20 overflow-hidden"} aria-hidden="true">
      <div
        className={sm
          ? "absolute left-[-26px] top-[10px] w-[90px] -rotate-45 text-center text-[7px] font-bold uppercase tracking-wider text-white shadow-md"
          : "absolute left-[-34px] top-[14px] w-[120px] -rotate-45 text-center text-[10px] font-bold uppercase tracking-wider text-white shadow-md"}
        style={{ backgroundColor: overdue ? "#dc2626" : "#d97706", padding: sm ? "2px 0" : "3px 0" }}
      >
        Verliehen
      </div>
    </div>
  );
}

export function isLentOverdue(lentUntil: string | null | undefined) {
  return !!lentUntil && lentUntil < new Date().toISOString().slice(0, 10);
}
