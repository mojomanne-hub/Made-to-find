import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">
          Neues Passwort
        </h1>
        <p className="text-sm text-neutral-500">
          Wähle ein sicheres Passwort mit mindestens 8 Zeichen.
        </p>
      </div>

      <ResetPasswordForm />
    </>
  );
}
