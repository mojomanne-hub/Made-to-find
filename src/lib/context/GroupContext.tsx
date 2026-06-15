"use client";

/**
 * GroupContext – verwaltet den aktiven Gruppenkontext.
 *
 * Der aktive Kontext wird in einem Cookie gespeichert damit
 * Server Components ihn lesen können (getActiveGroupId).
 *
 * Cookie: "active-group" = group UUID oder leer = Meine Daten
 */

import {
  createContext, useContext, useState, useEffect, type ReactNode,
} from "react";

export interface Group {
  id:           string;
  name:         string;
  invite_token: string;
  created_by:   string;
}

interface GroupContextValue {
  activeGroup:    Group | null;
  groups:         Group[];
  setActiveGroup: (group: Group | null) => void;
  setGroups:      (groups: Group[]) => void;
}

const COOKIE_NAME = "active-group";

function setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function deleteCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

const GroupContext = createContext<GroupContextValue>({
  activeGroup: null, groups: [],
  setActiveGroup: () => {}, setGroups: () => {},
});

export function GroupProvider({ children, initialGroupId, initialGroups }: {
  children:       ReactNode;
  initialGroupId: string | null;
  initialGroups:  Group[];
}) {
  const [groups, setGroups]   = useState<Group[]>(initialGroups);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(
    initialGroupId ? (initialGroups.find((g) => g.id === initialGroupId) ?? null) : null
  );

  function setActiveGroup(group: Group | null) {
    setActiveGroupState(group);
    if (group) setCookie(group.id);
    else       deleteCookie();
    // Seite neu laden damit Server Components den neuen Kontext bekommen
    window.location.reload();
  }

  return (
    <GroupContext.Provider value={{ activeGroup, groups, setActiveGroup, setGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
