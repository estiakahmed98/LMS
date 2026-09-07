import { afterEach, describe, expect, it, vi } from 'vitest';
import { canJoinLearnerSession, fetchLearnerLiveClasses, hasLearnerRecording } from './learner-live-client';

afterEach(() => vi.unstubAllGlobals());

describe('learner live class controls', () => {
  const session = { status: 'UPCOMING' as const, scheduledStart: '2026-09-07T10:00:00Z', scheduledEnd: '2026-09-07T11:00:00Z' };
  it('opens joining exactly ten minutes before start and stops at the end', () => {
    expect(canJoinLearnerSession(session, new Date('2026-09-07T09:49:59Z'))).toBe(false);
    expect(canJoinLearnerSession(session, new Date('2026-09-07T09:50:00Z'))).toBe(true);
    expect(canJoinLearnerSession(session, new Date('2026-09-07T11:00:00Z'))).toBe(false);
    expect(canJoinLearnerSession({ ...session, status: 'LIVE' }, new Date('2026-09-07T11:10:00Z'))).toBe(true);
    for (const status of ['COMPLETED', 'MISSED', 'CANCELLED'] as const) expect(canJoinLearnerSession({ ...session, status }, new Date(session.scheduledStart))).toBe(false);
  });
  it('accepts YouTube-only recordings and rejects empty recording values', () => {
    expect(hasLearnerRecording({ recordingUrl: null, youtubeVideoId: 'youtube-id' })).toBe(true);
    expect(hasLearnerRecording({ recordingUrl: '/uploads/recording.webm', youtubeVideoId: null })).toBe(true);
    expect(hasLearnerRecording({ recordingUrl: ' ', youtubeVideoId: '' })).toBe(false);
  });
});

describe('calendar fetching', () => {
  const page = (id: string, nextCursor: string | null) => new Response(JSON.stringify({ courses: [], sessions: [{ id }], pagination: { nextCursor, hasMore: nextCursor !== null, pageSize: 50 } }));
  it('loads all pages within the selected calendar range', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(page('first', 'next')).mockResolvedValueOnce(page('last', null));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    const result = await fetchLearnerLiveClasses(new URLSearchParams('scope=calendar&dateFrom=2026-09-01'), signal);
    expect(result.sessions.map(s => s.id)).toEqual(['first', 'last']);
    expect(fetchMock.mock.calls[1][0]).toContain('cursor=next');
    expect(fetchMock.mock.calls[1][0]).toContain('dateFrom=2026-09-01');
    expect(fetchMock.mock.calls[1][1].signal).toBe(signal);
  });
  it('keeps recordings paginated', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page('first', 'next'));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchLearnerLiveClasses(new URLSearchParams('scope=recordings'), new AbortController().signal);
    expect(result.pagination.hasMore).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('fails visibly when a later calendar page fails instead of showing a partial calendar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(page('first', 'next')).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 })));
    await expect(fetchLearnerLiveClasses(new URLSearchParams('scope=calendar'), new AbortController().signal)).rejects.toThrow('Unavailable');
  });
  it('does not loop forever if the server repeats a cursor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => page('first', 'same')));
    await expect(fetchLearnerLiveClasses(new URLSearchParams('scope=calendar'), new AbortController().signal)).rejects.toThrow('full calendar');
  });
});
