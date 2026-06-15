"use client";

/**
 * SharedAccessModal – Geteilter Zugriff
 *
 * Screens:
 * 1. Hauptmenü: Gruppe erstellen / beitreten / teilen
 * 2. Gruppe erstellen (Name eingeben)
 * 3. Gruppe beitreten (Link eingeben)
 * 4. Gruppe teilen (Link + E-Mail einladen)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronLeft, Users, Plus, LogIn,
  Share2, Mail, Copy, Check, Loader2,
  Edit2, Trash2,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn }    from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import type { Group } from "@/lib/context/GroupContext";

type Screen = "menu" | "create" | "join" | "share" | "manage";

interface SharedAccessModalProps {
  isOpen:             boolean;
  onClose:            () => void;
  initialGroup:       Group | null;  // null = keine Gruppe vorgewählt
  initialManageGroup?: Group | null; // direkt im "manage"-Screen öffnen
  groups:             Group[];
  onGroupsChange:     (groups: Group[]) => void;
  userId:             string;
}

export function SharedAccessModal({
  isOpen, onClose, initialGroup, initialManageGroup, groups, onGroupsChange, userId,
}: SharedAccessModalProps) {
  const router = useRouter();

  const [screen,      setScreen]      = useState<Screen>(
    initialManageGroup ? "manage" : initialGroup ? "share" : "menu"
  );
  const [shareGroup,  setShareGroup]  = useState<Group | null>(initialGroup);
  const [manageGroup, setManageGroup] = useState<Group | null>(initialManageGroup ?? null);
  const [editName,    setEditName]    = useState(initialManageGroup?.name ?? "");
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [groupName,   setGroupName]   = useState("");
  const [joinLink,    setJoinLink]    = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  // Beim Öffnen den richtigen Screen + Gruppe setzen
  useEffect(() => {
    if (!isOpen) return;
    if (initialManageGroup) {
      setScreen("manage");
      setManageGroup(initialManageGroup);
      setEditName(initialManageGroup.name);
    } else if (initialGroup) {
      setScreen("share");
      setShareGroup(initialGroup);
    } else {
      setScreen("menu");
    }
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialManageGroup, initialGroup]);

  if (!isOpen) return null;

  function reset() {
    setScreen(initialManageGroup ? "manage" : initialGroup ? "share" : "menu");
    setShareGroup(initialGroup);
    setManageGroup(initialManageGroup ?? null);
    setEditName(initialManageGroup?.name ?? "");
    setGroupName("");
    setJoinLink("");
    setInviteEmail("");
    setError(null);
    setSuccess(null);
  }


  // Gruppe umbenennen
  async function handleRenameGroup() {
    if (!manageGroup || !editName.trim()) return;
    setEditLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("groups")
        .update({ name: editName.trim() })
        .eq("id", manageGroup.id);
      if (error) throw error;
      const updated = groups.map((g) =>
        g.id === manageGroup.id ? { ...g, name: editName.trim() } : g
      );
      onGroupsChange(updated);
      setManageGroup({ ...manageGroup, name: editName.trim() });
      setSuccess("Gruppenname gespeichert.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setEditLoading(false);
    }
  }

  // Gruppe verlassen
  async function handleLeaveGroup() {
    if (!manageGroup) return;
    setIsDeleting(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", manageGroup.id)
        .eq("user_id", user.id);
      if (error) throw error;
      // Cookie löschen falls aktive Gruppe
      document.cookie = "active-group=; path=/; max-age=0";
      onGroupsChange(groups.filter((g) => g.id !== manageGroup.id));
      setScreen("menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Gruppe löschen (nur Ersteller)
  async function handleDeleteGroup() {
    if (!manageGroup) return;
    if (!confirm(`Gruppe "${manageGroup.name}" wirklich löschen? Alle Daten der Gruppe bleiben erhalten.`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", manageGroup.id);
      if (error) throw error;
      document.cookie = "active-group=; path=/; max-age=0";
      onGroupsChange(groups.filter((g) => g.id !== manageGroup.id));
      setScreen("menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Einladungslink aus Token bauen
  function buildInviteLink(token: string) {
    return `${window.location.origin}/join/${token}`;
  }

  // Link kopieren
  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Gruppe erstellen
  async function handleCreateGroup() {
    if (!groupName.trim()) { setError("Bitte gib einen Gruppennamen ein."); return; }
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();

      // Gruppe erstellen
      const { data: group, error: gErr } = await supabase
        .from("groups")
        .insert({ name: groupName.trim(), created_by: userId })
        .select()
        .single();
      if (gErr) throw gErr;

      // Ersteller als Mitglied hinzufügen
      await supabase.from("group_members").insert({ group_id: group.id, user_id: userId });

      // Gruppen-Liste aktualisieren
      const newGroups = [...groups, group as Group];
      onGroupsChange(newGroups);

      // Direkt zur Share-Ansicht
      setShareGroup(group as Group);
      setScreen("share");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen.");
    } finally {
      setIsLoading(false);
    }
  }

  // Gruppe per Link beitreten
  async function handleJoinGroup() {
    if (!joinLink.trim()) { setError("Bitte füge den Einladungslink ein."); return; }

    // Token aus Link extrahieren
    const token = joinLink.trim().split("/join/").pop() ?? joinLink.trim();

    setIsLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: groupId, error: jErr } = await supabase
        .rpc("join_group_by_token", { token });
      if (jErr) throw jErr;

      // Gruppe laden und zur Liste hinzufügen
      const { data: group } = await supabase
        .from("groups")
        .select("id, name, invite_token, created_by")
        .eq("id", groupId)
        .single();

      if (group) {
        onGroupsChange([...groups, group as Group]);
        setShareGroup(group as Group);
        setScreen("share");
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ungültiger Link.";
      setError(msg.includes("Ungültiger") ? msg : "Einladungslink ungültig oder abgelaufen.");
    } finally {
      setIsLoading(false);
    }
  }

  // Mitglied per E-Mail einladen
  async function handleInviteByEmail() {
    if (!inviteEmail.trim() || !shareGroup) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const supabase = createBrowserClient();

      // Edge Function via Supabase-Client aufrufen
      const { data: { session } } = await supabase.auth.getSession();

      // Supabase URL aus dem Client-Objekt lesen (funktioniert in Browser)
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
        ?? "https://scewmbvnwyxnuiedtwhz.supabase.co";

      const response = await fetch(
        `${supabaseUrl}/functions/v1/invite-to-group`,
        {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            email:    inviteEmail.trim().toLowerCase(),
            group_id: shareGroup.id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Fehler beim Einladen.");

      setSuccess(`Einladung wurde an ${inviteEmail} verschickt. Die Person muss die Einladung noch bestätigen.`);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Einladen.");
    } finally {
      setIsLoading(false);
    }
  }

  const inviteLink = shareGroup ? buildInviteLink(shareGroup.invite_token) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2d3f55" }}>
          {screen !== "menu" && (
            <button
              onClick={() => { setScreen("menu"); setError(null); setSuccess(null); }}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Users className="h-5 w-5 text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100 flex-1">Geteilter Zugriff</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">

          {/* ── Screen: Hauptmenü ── */}
          {screen === "menu" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">
                Teile deine Gegenstände und Ablageorte mit deiner Gruppe.
              </p>

              <button
                onClick={() => { setScreen("create"); setError(null); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left"
              >
                <div className="h-9 w-9 rounded-xl bg-brand-900/50 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe erstellen</p>
                  <p className="text-xs text-slate-500">Gib deiner Gruppe einen Namen</p>
                </div>
              </button>

              <button
                onClick={() => { setScreen("join"); setError(null); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left"
              >
                <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <LogIn className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe beitreten</p>
                  <p className="text-xs text-slate-500">Einladungslink eingeben</p>
                </div>
              </button>

              {/* Bestehende Gruppen teilen/bearbeiten */}
              {groups.map((group) => (
                <div key={group.id} className="flex gap-2">
                  <button
                    onClick={() => { setShareGroup(group); setScreen("share"); setError(null); }}
                    className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left"
                  >
                    <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Share2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">„{group.name}" teilen</p>
                      <p className="text-xs text-slate-500">Link teilen oder einladen</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setManageGroup(group); setEditName(group.name); setScreen("manage"); setError(null); setSuccess(null); }}
                    className="px-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-slate-400 hover:text-slate-200"
                    title="Gruppe bearbeiten"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Screen: Gruppe erstellen ── */}
          {screen === "create" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Gruppenname</label>
                <input
                  type="text"
                  placeholder="z.B. Meine Gruppe"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  autoFocus
                  className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500">
                  Gib deiner Gruppe einen Namen, um gemeinsam Gegenstände zu verwalten.
                </p>
              </div>

              {error && <p className="text-xs text-danger-400">{error}</p>}

              <button
                onClick={handleCreateGroup}
                disabled={isLoading || !groupName.trim()}
                className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Erstelle…</>
                  : "Gruppe erstellen & Mitglieder einladen"
                }
              </button>
            </div>
          )}

          {/* ── Screen: Gruppe beitreten ── */}
          {screen === "join" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Einladungslink eingeben</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  autoFocus
                  className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500">
                  Füge hier den Link ein, den du von deinem Familienmitglied erhalten hast.
                </p>
              </div>

              {error && <p className="text-xs text-danger-400">{error}</p>}

              <button
                onClick={handleJoinGroup}
                disabled={isLoading || !joinLink.trim()}
                className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Beitreten…</>
                  : <><LogIn className="h-4 w-4" /> Beitreten</>
                }
              </button>
            </div>
          )}

          {/* ── Screen: Gruppe teilen ── */}
          {screen === "share" && shareGroup && (
            <div className="space-y-5">
              {/* Gruppenname */}
              <div className="px-3 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2.5">
                <div
                  className="h-5 w-5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#3b82f6" }}
                />
                <span className="text-sm font-medium text-slate-200">{shareGroup.name}</span>
              </div>

              {/* E-Mail einladen */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Per E-Mail einladen
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="email@beispiel.de"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
                    className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleInviteByEmail}
                    disabled={isLoading || !inviteEmail.trim()}
                    className="px-4 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Senden"}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Die Person erhält eine E-Mail und muss die Einladung bestätigen.
                </p>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <span className="text-emerald-500">✓</span> Funktioniert für registrierte und neue Benutzer.
                </p>
                {success && <p className="text-xs text-emerald-400">{success}</p>}
                {error   && <p className="text-xs text-danger-400">{error}</p>}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">ODER</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* Link teilen */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" /> Link teilen
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs text-slate-400 focus:outline-none truncate"
                  />
                  <button
                    onClick={() => handleCopy(inviteLink)}
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    )}
                    title="Link kopieren"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Teile diesen Link per WhatsApp oder E-Mail. Nicht registrierte Personen werden aufgefordert, sich zu registrieren und treten danach automatisch der Gruppe bei.
                </p>
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent("Du wurdest eingeladen, der Gruppe \u201e" + shareGroup.name + "\u201c beizutreten: " + inviteLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 bg-emerald-700/30 text-emerald-400 hover:bg-emerald-700/50 border border-emerald-800"
                  >
                    <span>📱</span> WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Einladung: " + shareGroup.name)}&body=${encodeURIComponent("Hallo,\n\ndu wurdest eingeladen, der Gruppe \u201e" + shareGroup.name + "\u201c beizutreten:\n\n" + inviteLink + "\n\nBis bald!")}`}
                    className="flex-1 h-9 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600"
                  >
                    <span>✉️</span> E-Mail
                  </a>
                </div>
              </div>
            </div>
          )}


          {/* ── Screen: Gruppe verwalten ── */}
          {screen === "manage" && manageGroup && (
            <div className="space-y-4">
              {error   && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              {/* Umbenennen */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Gruppenname</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()}
                    maxLength={100}
                    className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleRenameGroup}
                    disabled={editLoading || !editName.trim()}
                    className="px-4 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              {/* Gruppe verlassen */}
              <button
                onClick={handleLeaveGroup}
                disabled={isDeleting}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-amber-600/50 hover:bg-amber-900/20 transition-all text-left"
              >
                <div className="h-8 w-8 rounded-lg bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <LogIn className="h-4 w-4 text-amber-400 rotate-180" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe verlassen</p>
                  <p className="text-xs text-slate-500">Du verlässt die Gruppe, Daten bleiben erhalten</p>
                </div>
              </button>

              {/* Gruppe löschen */}
              <button
                onClick={handleDeleteGroup}
                disabled={isDeleting}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-danger-600/50 hover:bg-danger-900/20 transition-all text-left"
              >
                <div className="h-8 w-8 rounded-lg bg-danger-900/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-4 w-4 text-danger-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe löschen</p>
                  <p className="text-xs text-slate-500">Löscht die Gruppe für alle Mitglieder</p>
                </div>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
