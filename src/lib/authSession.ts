import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Espera a que Supabase restaure la sesión (p. ej. tras volver del OAuth de Spotify). */
export async function waitForAuthenticatedUser(
  maxWaitMs = 10000
): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, maxWaitMs);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.user) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve(nextSession.user);
      }
    });
  });
}
