import { NextResponse } from 'next/server';

/** A recipient's inbox must never be shared by a browser/proxy/CDN cache. */
export function notificationJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  return NextResponse.json(body, { ...init, headers });
}
