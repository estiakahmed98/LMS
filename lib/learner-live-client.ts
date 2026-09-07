import type { LearnerLiveClassesPayload, LearnerLiveSession } from './learner-live-types';

export function canJoinLearnerSession(session: Pick<LearnerLiveSession, 'status' | 'scheduledStart' | 'scheduledEnd'>, now: Date) {
  const time = now.getTime();
  return session.status === 'LIVE' || (session.status === 'UPCOMING'
    && time >= new Date(session.scheduledStart).getTime() - 10 * 60_000
    && time < new Date(session.scheduledEnd).getTime());
}

export function hasLearnerRecording(session: Pick<LearnerLiveSession, 'recordingUrl' | 'youtubeVideoId'>) {
  return Boolean(session.recordingUrl?.trim() || session.youtubeVideoId?.trim());
}

/** Calendar needs the whole visible range, not just the first database page. */
export async function fetchLearnerLiveClasses(params: URLSearchParams, signal: AbortSignal): Promise<LearnerLiveClassesPayload> {
  const query = new URLSearchParams(params);
  const calendar = query.get('scope') === 'calendar';
  const seen = new Set<string>();
  let result: LearnerLiveClassesPayload | null = null;
  while (true) {
    const response = await fetch(`/api/learner/live-classes?${query}`, { cache: 'no-store', signal });
    const page = await response.json() as LearnerLiveClassesPayload & { error?: string };
    if (!response.ok) throw new Error(page.error || 'Failed to load live classes.');
    result = result ? { ...page, sessions: [...result.sessions, ...page.sessions] } : page;
    const next = page.pagination.nextCursor;
    if (!calendar || !page.pagination.hasMore) return result;
    if (!next || seen.has(next)) throw new Error('Unable to load the full calendar. Please refresh.');
    seen.add(next);
    query.set('cursor', next);
  }
}
