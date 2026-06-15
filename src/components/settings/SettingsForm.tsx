"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Eye, EyeOff, User } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { changePasswordSchema } from "@/lib/validations";
import { getAuthError }         from "@/lib/utils";
import { ROUTES }               from "@/lib/constants";
import { Button }    from "@/components/ui/Button";
import { Input }     from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Alert }     from "@/components/ui/Alert";

interface SettingsFormProps {
  userEmail:   string;
  displayName: string;
}

export function SettingsForm({ userEmail, displayName: initialDisplayName }: SettingsFormProps) {
  const router = useRouter();

  // Profilname
  const [displayName,     setDisplayName]     = useState(initialDisplayName);
  const [nameLoading,     setNameLoading]     = useState(false);
  const [nameSuccess,     setNameSuccess]     = useState<string | null>(null);
  const [nameError,       setNameError]       = useState<string | null>(null);

  // Passwort
  const [password,        setPassword]        = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [success,         setSuccess]         = useState<string | null>(null);

  // ── Profilname speichern ──────────────────────────────────
  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    if (displayName.trim().length > 50) {
      setNameError("Maximal 50 Zeichen.");
      return;
    }

    setNameLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", user.id);

      if (error) throw error;
      setNameSuccess("Name gespeichert.");
      // Seite neu laden damit Sidebar den neuen Namen zeigt
      router.refresh();
    } catch {
      setNameError("Fehler beim Speichern.");
    } finally {
      setNameLoading(false);
    }
  }

  // ── Passwort ändern ───────────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setSuccess(null);

    const result = changePasswordSchema.safeParse({ password, passwordConfirm });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.errors) {
        const field = String(err.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: result.data.password });
      if (error) { setErrors({ root: getAuthError(error.message) }); return; }
      setSuccess("Passwort erfolgreich geändert.");
      setPassword(""); setPasswordConfirm("");
    } catch { setErrors({ root: "Ein Fehler ist aufgetreten." }); }
    finally { setIsLoading(false); }
  }

  async function handleLogout() {
    setIsLogoutLoading(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  const inputCls = "w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-slate-500 transition-colors";

  return (
    <>
      {/* ── Profilname ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-100">Profilname</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSave} className="space-y-3">
            {nameError   && <Alert variant="error">{nameError}</Alert>}
            {nameSuccess && <Alert variant="success">{nameSuccess}</Alert>}
            <Input
              label="Anzeigename"
              placeholder="z.B. Max Mustermann"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              hint="Wird in der App und in Gruppen angezeigt"
              maxLength={50}
            />
            <Button type="submit" size="sm" isLoading={nameLoading}>
              Name speichern
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Konto ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-100">Konto</h2>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-1">E-Mail-Adresse</p>
          <p className="text-sm font-medium text-slate-300">{userEmail}</p>
        </CardContent>
      </Card>

      {/* ── Passwort ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-100">Passwort ändern</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {errors.root && <Alert variant="error">{errors.root}</Alert>}
            {success     && <Alert variant="success">{success}</Alert>}

            {(["password", "passwordConfirm"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  {field === "password" ? "Neues Passwort" : "Bestätigen"}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={field === "password" ? password : passwordConfirm}
                    onChange={(e) => field === "password"
                      ? setPassword(e.target.value)
                      : setPasswordConfirm(e.target.value)}
                    required
                    className={`${inputCls} pl-10 pr-10`}
                  />
                  {field === "password" && (
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {errors[field] && <p className="text-xs text-danger-400">{errors[field]}</p>}
              </div>
            ))}

            <Button type="submit" size="sm" isLoading={isLoading}>
              Passwort ändern
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Abmelden ── */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-100">Sitzung</h2></CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={handleLogout} isLoading={isLogoutLoading}>
            <LogOut className="h-4 w-4" /> Abmelden
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
