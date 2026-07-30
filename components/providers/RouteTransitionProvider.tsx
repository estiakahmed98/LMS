"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ContentSkeleton from "@/components/navigation/ContentSkeleton";

interface RouteTransitionContextValue {
  active: boolean;
  start: () => void;
  stop: () => void;
}

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteKeyRef = useRef(routeKey);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActive(false);
  }, []);

  const start = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setActive(true);
    timeoutRef.current = window.setTimeout(() => {
      setActive(false);
      timeoutRef.current = null;
    }, 10_000);
  }, []);

  useEffect(() => {
    if (previousRouteKeyRef.current !== routeKey) {
      previousRouteKeyRef.current = routeKey;
      stop();
    }
  }, [routeKey, stop]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      active,
      start,
      stop,
    }),
    [active, start, stop],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error(
      "useRouteTransition must be used inside RouteTransitionProvider.",
    );
  }
  return context;
}

export function RouteTransitionSkeleton() {
  const { active } = useRouteTransition();

  if (!active) {
    return null;
  }

  return (
    <div
      aria-label="Loading page"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden bg-background"
    >
      <ContentSkeleton className="p-4 md:p-6" />
    </div>
  );
}
