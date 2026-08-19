"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronLeft, Users, Plus, LogIn,
  Share2, Copy, Check, Loader2, Edit2, Trash2, Info, Crown,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/context/GroupContext";

type Screen = "menu" | "create" | "join" | "share" | "manage" | "members";

interface GroupMember {
  user_id: string;
  display_name: string | null;
}

interface SharedAccessModalProps {
  isOpen:               boolean;
  onClose:              () => void;
  initialGroup:         Group | null;
  initialManageGroup?:  Group | null;
  initialMembersGroup?: Group | null;
  groups:               Group[];
  onGroupsChange:       (groups: Group[]) => void;
  userId:               string;
}

export function SharedAccessModal({
  isOpen, onClose, initialGroup, initialManageGroup, initialMembersGroup, groups, onGroupsChange, userId,
}: SharedAccessModalProps) {
  const router = useRouter();

  const [screen,      setScreen]      = useState<Screen>(
    initialMembersGroup ? "members" : initialManageGroup ? "manage" : initialGroup ? "share" : "menu"
  );
  const [shareGroup,  setShareGroup]  = useState<Group | null>(initialGroup);
  const [manageGroup, setManageGroup] = useState<Group | null>(initialManageGroup ?? null);
  const [groupName,   setGroupName]   = useState("");
  const [joinLink,    setJoinLink]    = useState("");
  const [editName,    setEditName]    = useState(initialManageGroup?.name ?? "");
  const [isLoading,   setIsLoading]   = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  const [members,        setMembers]        = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialMembersGroup) {
      setScreen("members");
      openMembers(initialMembersGroup);
    } else if (initialManageGroup) {
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
  }, [isOpen, initialManageGroup, initialGroup, initialMembersGroup]);

  if (!isOpen) return null;

  function handleClose() {
    setScreen(initialMembersGroup ? "members" : initialManageGroup ? "manage" : initialGroup ? "share" : "menu");
    setShareGroup(initialGroup);
    setManageGroup(initialManageGroup ?? initialMembersGroup ?? null);
    setEditName(initialManageGroup?.name ?? "");
    setGroupName("");
    setJoinLink("");
    setError(null);
    setSuccess(null);
    onClose();
  }

  function buildInviteLink(token: string) {
    return window.location.origin + "/join/" + token;
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) { setError("Bitte gib einen Gruppennamen ein."); return; }
    setIsLoading(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: group, error: gErr } = await supabase
        .from("groups").insert({ name: groupName.trim(), created_by: userId }).select().single();
      if (gErr) throw gErr;
      await supabase.from("group_members").insert({ group_id: group.id, user_id: userId });
      onGroupsChange([...groups, group as Group]);
      setShareGroup(group as Group);
      setScreen("share");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen.");
    } finally { setIsLoading(false); }
  }

  async function handleJoinGroup() {
    if (!joinLink.trim()) { setError("Bitte füge den Einladungslink ein."); return; }
    const token = joinLink.trim().split("/join/").pop() ?? joinLink.trim();
    setIsLoading(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: groupId, error: jErr } = await supabase.rpc("join_group_by_token", { token });
      if (jErr) throw jErr;
      const { data: group } = await supabase.from("groups").select("id, name, invite_token, created_by").eq("id", groupId).single();
      if (group) { onGroupsChange([...groups, group as Group]); setShareGroup(group as Group); setScreen("share"); }
      router.refresh();
    } catch {
      setError("Einladungslink ungültig oder abgelaufen.");
    } finally { setIsLoading(false); }
  }

  async function handleRenameGroup() {
    if (!manageGroup || !editName.trim()) return;
    setEditLoading(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("groups").update({ name: editName.trim() }).eq("id", manageGroup.id);
      if (error) throw error;
      const updated = groups.map((g) => g.id === manageGroup.id ? { ...g, name: editName.trim() } : g);
      onGroupsChange(updated);
      setManageGroup({ ...manageGroup, name: editName.trim() });
      setSuccess("Gruppenname gespeichert.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally { setEditLoading(false); }
  }

  async function handleLeaveGroup() {
    if (!manageGroup) return;
    setIsDeleting(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("group_members").delete().eq("group_id", manageGroup.id).eq("user_id", user.id);
      document.cookie = "active-group=; path=/; max-age=0";
      onGroupsChange(groups.filter((g) => g.id !== manageGroup.id));
      setScreen("menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally { setIsDeleting(false); }
  }

  async function handleDeleteGroup() {
    if (!manageGroup) return;
    if (!isCreator(manageGroup)) return;
    if (!confirm("Gruppe \"" + manageGroup.name + "\" wirklich loeschen?")) return;
    setIsDeleting(true); setError(null);
    try {
      const supabase = createBrowserClient();
      await supabase.from("groups").delete().eq("id", manageGroup.id);
      document.cookie = "active-group=; path=/; max-age=0";
      onGroupsChange(groups.filter((g) => g.id !== manageGroup.id));
      setScreen("menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally { setIsDeleting(false); }
  }

  function isCreator(group: Group) {
    return (group as Group & { created_by?: string }).created_by === userId;
  }

  async function openMembers(group: Group) {
    setManageGroup(group);
    setScreen("members");
    setMembersLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: memberRows, error: mErr } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group.id);
      if (mErr) throw mErr;

      const userIds = (memberRows ?? []).map((r) => r.user_id as string);
      if (userIds.length === 0) {
        setMembers([]);
        return;
      }

      const { data: profileRows, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      if (pErr) throw pErr;

      const list: GroupMember[] = userIds.map((uid) => {
        const profile = profileRows?.find((p) => p.id === uid);
        return { user_id: uid, display_name: profile?.display_name ?? null };
      });
      setMembers(list);
    } catch (err) {
      setError(err instanceof Error ? `Mitglieder konnten nicht geladen werden: ${err.message}` : "Mitglieder konnten nicht geladen werden.");
    } finally {
      setMembersLoading(false);
    }
  }

  const inviteLink = shareGroup ? buildInviteLink(shareGroup.invite_token) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2d3f55" }}>
          {screen !== "menu" && (
            <button onClick={() => { setScreen("menu"); setError(null); setSuccess(null); }}
              className="text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Users className="h-5 w-5 text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100 flex-1">
            {screen === "members" ? "Mitglieder" : "Geteilter Zugriff"}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">

          {/* Hauptmenu */}
          {screen === "menu" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">Teile deine Gegenstände und Ablageorte mit deiner Gruppe.</p>

              <button onClick={() => { setScreen("create"); setError(null); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left">
                <div className="h-9 w-9 rounded-xl bg-brand-900/50 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe erstellen</p>
                  <p className="text-xs text-slate-500">Gib deiner Gruppe einen Namen</p>
                </div>
              </button>

              <button onClick={() => { setScreen("join"); setError(null); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left">
                <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <LogIn className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe beitreten</p>
                  <p className="text-xs text-slate-500">Einladungslink eingeben</p>
                </div>
              </button>

              {groups.map((group) => (
                <div key={group.id} className="flex gap-2">
                  <button onClick={() => { setShareGroup(group); setScreen("share"); setError(null); }}
                    className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left">
                    <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Share2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">"{group.name}" teilen</p>
                      <p className="text-xs text-slate-500">Link teilen oder einladen</p>
                    </div>
                  </button>
                  <button onClick={() => openMembers(group)}
                    title="Mitglieder anzeigen"
                    className="px-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-slate-400 hover:text-slate-200">
                    <Info className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setManageGroup(group); setEditName(group.name); setScreen("manage"); setError(null); setSuccess(null); }}
                    title="Gruppe verwalten"
                    className="px-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-slate-400 hover:text-slate-200">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Gruppe erstellen */}
          {screen === "create" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Gruppenname</label>
                <input type="text" placeholder="z.B. Meine Gruppe" value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  autoFocus
                  className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-slate-500">Gib deiner Gruppe einen Namen, um gemeinsam Gegenstände zu verwalten.</p>
              </div>
              {error && <p className="text-xs text-danger-400">{error}</p>}
              <button onClick={handleCreateGroup} disabled={isLoading || !groupName.trim()}
                className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Erstelle...</> : "Gruppe erstellen & Mitglieder einladen"}
              </button>
            </div>
          )}

          {/* Gruppe beitreten */}
          {screen === "join" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Einladungslink eingeben</label>
                <input type="text" placeholder="https://..." value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)} autoFocus
                  className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-slate-500">Füge hier den Link ein, den du von deinem Familienmitglied erhalten hast.</p>
              </div>
              {error && <p className="text-xs text-danger-400">{error}</p>}
              <button onClick={handleJoinGroup} disabled={isLoading || !joinLink.trim()}
                className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Beitreten...</> : <><LogIn className="h-4 w-4" /> Beitreten</>}
              </button>
            </div>
          )}

          {/* Gruppe teilen */}
          {screen === "share" && shareGroup && (
            <div className="space-y-5">
              <div className="px-3 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-full flex-shrink-0" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-sm font-medium text-slate-200">{shareGroup.name}</span>
              </div>

              {/* Einladungslink */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" /> Einladungslink
                </p>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink}
                    className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs text-slate-400 focus:outline-none truncate" />
                  <button onClick={() => handleCopy(inviteLink)}
                    className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
                      copied ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600")}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Nicht registrierte Personen werden aufgefordert sich zu registrieren und treten danach automatisch bei.
                </p>
              </div>

              {/* Teilen-Buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Direkt teilen</p>
                <div className="flex gap-2">
                  <a href={"https://wa.me/?text=" + encodeURIComponent("Du wurdest eingeladen, der Gruppe " + shareGroup.name + " beizutreten: " + inviteLink)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-emerald-700/30 text-emerald-400 hover:bg-emerald-700/50 border border-emerald-800 transition-colors">
                    WhatsApp
                  </a>
                  <a href={"mailto:?subject=" + encodeURIComponent("Einladung: " + shareGroup.name) + "&body=" + encodeURIComponent("Hallo, du wurdest eingeladen der Gruppe " + shareGroup.name + " beizutreten: " + inviteLink)}
                    className="flex-1 h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-brand-700/30 text-brand-400 hover:bg-brand-700/50 border border-brand-800 transition-colors">
                    E-Mail
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Mitglieder anzeigen */}
          {screen === "members" && manageGroup && (
            <div className="space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Keine Mitglieder gefunden.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-700">
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-300">
                        {(m.display_name?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-200 flex-1">
                        {m.display_name || "Unbenannt"}
                        {m.user_id === userId && <span className="text-slate-500"> (Du)</span>}
                      </span>
                      {isCreator(manageGroup) && m.user_id === (manageGroup as Group & { created_by?: string }).created_by && (
                        <span title="Ersteller" className="flex items-center gap-1 text-xs text-amber-400">
                          <Crown className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {!isCreator(manageGroup) && m.user_id === (manageGroup as Group & { created_by?: string }).created_by && (
                        <span title="Ersteller" className="flex items-center gap-1 text-xs text-amber-400">
                          <Crown className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gruppe verwalten */}
          {screen === "manage" && manageGroup && (
            <div className="space-y-4">
              {error   && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Gruppenname</label>
                <div className="flex gap-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()} maxLength={100}
                    className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button onClick={handleRenameGroup} disabled={editLoading || !editName.trim()}
                    className="px-4 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                  </button>
                </div>
              </div>

              <button onClick={() => openMembers(manageGroup)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/30 transition-all text-left">
                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Info className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Mitglieder anzeigen</p>
                  <p className="text-xs text-slate-500">Wer ist alles in dieser Gruppe</p>
                </div>
              </button>

              <div className="h-px bg-slate-700" />

              <button onClick={handleLeaveGroup} disabled={isDeleting}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-amber-600/50 hover:bg-amber-900/20 transition-all text-left">
                <div className="h-8 w-8 rounded-lg bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <LogIn className="h-4 w-4 text-amber-400 rotate-180" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Gruppe verlassen</p>
                  <p className="text-xs text-slate-500">Du verlässt die Gruppe, Daten bleiben erhalten</p>
                </div>
              </button>

              {isCreator(manageGroup) ? (
                <button onClick={handleDeleteGroup} disabled={isDeleting}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-danger-600/50 hover:bg-danger-900/20 transition-all text-left">
                  <div className="h-8 w-8 rounded-lg bg-danger-900/30 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-4 w-4 text-danger-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Gruppe löschen</p>
                    <p className="text-xs text-slate-500">Löscht die Gruppe für alle Mitglieder</p>
                  </div>
                </button>
              ) : (
                <p className="text-xs text-slate-600 px-1">
                  Nur der Ersteller der Gruppe kann sie vollständig löschen.
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
