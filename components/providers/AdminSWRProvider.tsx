"use client";

import { SWRConfig } from "swr";

export default function AdminSWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 30_000,
        errorRetryCount: 2,
        focusThrottleInterval: 60_000,
        keepPreviousData: true,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
