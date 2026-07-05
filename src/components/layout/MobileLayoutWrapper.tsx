"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import type { User }    from "@supabase/supabase-js";
import type { Group }   from "@/lib/context/GroupContext";

interface Props {
  user:        User;
  groups:      Group[];
  displayName: string;
}

export function MobileLayoutWrapper({ user, groups, displayName }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <MobileHeader
        onMenuOpen={() => setDrawerOpen(true)}
        groups={groups}
        displayName={displayName}
      />
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        groups={groups}
        displayName={displayName}
      />
    </>
  );
}
