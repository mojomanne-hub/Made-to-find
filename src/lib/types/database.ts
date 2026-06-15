/**
 * Datenbanktypen – exakt abgeleitet aus dem Supabase-Schema.
 *
 * Bei Schemaänderungen regenerieren:
 *   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// -------------------------------------------------------
// Rohe Datenbanktypen (1:1 mit Supabase-Tabellen)
// -------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:           string;
          email:        string;
          display_name: string | null;
          created_at:   string;
        };
        Insert: {
          id:           string;
          email:        string;
          display_name?: string | null;
          created_at?:  string;
        };
        Update: {
          email?:        string;
          display_name?: string | null;
        };
      };

      locations: {
        Row: {
          id:          string;
          user_id:     string;
          name:        string;
          description: string | null;
          color:       string | null;
          created_at:  string;
          updated_at:  string;
          deleted_at:  string | null;
        };
        Insert: {
          id?:         string;
          user_id:     string;
          name:        string;
          description?: string | null;
          color?:       string | null;
          created_at?:  string;
          updated_at?:  string;
          deleted_at?:  string | null;
        };
        Update: {
          name?:        string;
          description?: string | null;
          color?:       string | null;
          updated_at?:  string;
          deleted_at?:  string | null;
        };
      };

      items: {
        Row: {
          id:          string;
          location_id: string;
          user_id:     string;
          name:        string;
          description: string | null;
          quantity:    number;
          created_at:  string;
          updated_at:  string;
          deleted_at:  string | null;
        };
        Insert: {
          id?:          string;
          location_id:  string;
          user_id:      string;
          name:         string;
          description?:  string | null;
          quantity?:     number;
          created_at?:  string;
          updated_at?:  string;
          deleted_at?:  string | null;
        };
        Update: {
          location_id?:  string;
          name?:         string;
          description?:  string | null;
          quantity?:     number;
          updated_at?:   string;
          deleted_at?:   string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      search: {
        Args: { query: string };
        Returns: Array<{
          kind:          string;
          id:            string;
          name:          string;
          description:   string | null;
          location_id:   string;
          location_name: string;
          quantity:      number | null;
          updated_at:    string;
        }>;
      };
    };
    Enums: Record<string, never>;
  };
}

// -------------------------------------------------------
// Convenience-Aliases – werden im Code verwendet
// -------------------------------------------------------
export type Profile  = Database["public"]["Tables"]["profiles"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Item     = Database["public"]["Tables"]["items"]["Row"];

export type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
export type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];
export type ItemInsert     = Database["public"]["Tables"]["items"]["Insert"];
export type ItemUpdate     = Database["public"]["Tables"]["items"]["Update"];

// -------------------------------------------------------
// App-Typen (angereichert, für die UI)
// -------------------------------------------------------

/** Location mit Artikel-Anzahl (via count-Join) */
export interface LocationWithCount extends Location {
  item_count: number;
}

/** Item mit verknüpftem Ablageort-Namen */
export interface ItemWithLocation extends Item {
  location: Pick<Location, "id" | "name" | "color">;
}

/** Suchergebnis aus der DB-Funktion */
export type SearchResultRow = Database["public"]["Functions"]["search"]["Returns"][number];

/** Typisiertes Suchergebnis für die UI */
export type SearchResult =
  | { kind: "item";     data: SearchResultRow }
  | { kind: "location"; data: SearchResultRow };
