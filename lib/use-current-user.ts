"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, subscribeSessionUserChanges } from "@/lib/auth";
import type { User } from "@/lib/mock-data";

interface CurrentUserOptions {
  allowPathFallback?: boolean;
}

/**
 * Client-only session identity. Starts as undefined on server + first client
 * paint so SSR HTML matches hydration, then fills from the mirrored session
 * cookie after mount.
 */
export function useCurrentUser(pathname?: string, options?: CurrentUserOptions) {
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const refresh = () => setUser(getCurrentUser(pathname, options));
    refresh();
    return subscribeSessionUserChanges(refresh);
  }, [pathname, options?.allowPathFallback]);

  return user;
}
