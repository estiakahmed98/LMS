"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, subscribeSessionUserChanges } from "@/lib/auth";

interface CurrentUserOptions {
  allowPathFallback?: boolean;
}

export function useCurrentUser(pathname?: string, options?: CurrentUserOptions) {
  const [user, setUser] = useState(() => getCurrentUser(pathname, options));

  useEffect(() => {
    const refresh = () => setUser(getCurrentUser(pathname, options));
    refresh();
    return subscribeSessionUserChanges(refresh);
  }, [pathname, options?.allowPathFallback]);

  return user;
}
