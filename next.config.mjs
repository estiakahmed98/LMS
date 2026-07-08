import { networkInterfaces } from 'node:os'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Collect this machine's own IPv4 addresses so that whoever runs the dev
// server can reach it from another device on the same network — no hardcoded
// IPs, works for any developer on any network.
function localIpv4Origins() {
  const origins = new Set(['localhost'])
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        origins.add(addr.address)
      }
    }
  }
  return [...origins]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: localIpv4Origins(),
}

export default withNextIntl(nextConfig)
