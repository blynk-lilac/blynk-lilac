import { supabase as typedSupabase } from "@/integrations/supabase/client";

// Temporary type fallback until backend types are regenerated
export const supabase = typedSupabase as any;
