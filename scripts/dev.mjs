// Dev launcher that binds Next.js to the machine's real LAN IP so other
// devices on the same network can reach the dev server, and prints a
// clickable Network URL. Works for any developer on any network — the IP is
// detected at runtime, nothing is hardcoded.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

// Pick the best local IPv4: a private LAN address (192.168.x, 10.x, 172.16-31.x)
// preferring real Wi-Fi/Ethernet over virtual adapters (VPNs, WSL, Docker, etc.).
function getLanIp() {
  const nets = networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      candidates.push({ name, address: addr.address, netmask: addr.netmask });
    }
  }

  const isPrivate = (ip) =>
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

  // Point-to-point links (VPNs) usually have a /32 mask — deprioritize them.
  const isPointToPoint = (mask) => mask === "255.255.255.255";

  // Common virtual-adapter name hints to deprioritize.
  const isVirtual = (name) =>
    /vpn|proton|wsl|docker|virtual|vethernet|loopback|hyper-v/i.test(name);

  const ranked = candidates
    .filter((c) => isPrivate(c.address))
    .sort((a, b) => {
      const score = (c) =>
        (isPointToPoint(c.netmask) ? 2 : 0) + (isVirtual(c.name) ? 1 : 0);
      return score(a) - score(b);
    });

  return ranked[0]?.address ?? null;
}

const lanIp = getLanIp();
const port = process.env.PORT ?? "3000";

// Bind to 0.0.0.0 so every interface (localhost + LAN) can reach it.
const host = "0.0.0.0";

if (lanIp) {
  console.log(`\n  ➜  Network:  http://${lanIp}:${port}\n`);
} else {
  console.log(
    "\n  ➜  No LAN IP detected — the dev server is only reachable via localhost.\n",
  );
}

// Run the local `next` binary directly. Resolving the bin avoids spawning
// npx.cmd, which needs shell:true on Windows and is otherwise flaky (EINVAL).
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-H", host, "-p", port],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code) => process.exit(code ?? 0));
