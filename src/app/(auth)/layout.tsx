import { ROUTES } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#111827" }}
    >
      {/* Subtiler Hintergrund-Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Hauptinhalt */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative px-6 py-5 text-center">
        <p className="text-xs" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} MaDe to find · Deine Daten bleiben privat
        </p>
      </footer>
    </div>
  );
}
