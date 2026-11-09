"use client";

import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { openScanner } from "./scanner-events";

/** Button „Scannen“ (z. B. auf der Gegenstände-Seite) – öffnet den globalen Scanner */
export function ScanItemButton(_props: { groupId?: string | null } = {}) {
  return (
    <Button size="sm" variant="secondary" onClick={openScanner}>
      <ScanLine className="h-4 w-4" /> Scannen
    </Button>
  );
}
