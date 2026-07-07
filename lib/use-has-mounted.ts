import { useEffect, useState } from "react";

// Mock data in lib/mock-data.ts computes relative timestamps with Date.now()
// at module-load time, so the server and client instances of that module
// disagree by however many seconds/minutes elapsed between the two loads.
// Formatting those dates during the initial render causes a hydration
// mismatch. Gate that formatting on this flag so the server-rendered markup
// and the client's first render agree, then swap in the real value post-mount.
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
