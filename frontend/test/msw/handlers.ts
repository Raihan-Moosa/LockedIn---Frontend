import { http, HttpResponse } from 'msw';

// Add all your mocked endpoints here.
export const handlers = [
  http.get('https://api.example.com/me', () => {
    return HttpResponse.json({ id: 'u1', email: 'test@example.com' }, { status: 200 });
  }),
];

// --- add near the top with other in-memory data ---
let sessionsByGroup: Record<string, Array<{
  id: string;
  group_id: string;
  title: string;
  start: string;              // ISO string or date+time you use
  creator_id: string;
}>> = {
  g1: [
    { id: 's1', group_id: 'g1', title: 'Group Study (not mine)', start: '2030-10-10T10:00:00Z', creator_id: 'u2' },
    { id: 's2', group_id: 'g1', title: 'I own this session',     start: '2030-10-11T12:00:00Z', creator_id: 'u1' },
  ],
};



// fetch sessions by group (pattern 1)
handlers.push(
  http.get('*/api/groups/:groupId/sessions', ({ params }) => {
    const { groupId } = params as { groupId: string };
    const list = sessionsByGroup[groupId] ?? [];
    return HttpResponse.json({ sessions: list });
  })
);

// or fetch by query (?group_id=)
handlers.push(
  http.get('*/api/sessions', ({ request }) => {
    const url = new URL(request.url);
    const gid = url.searchParams.get('group_id') || 'g1';
    const list = sessionsByGroup[gid] ?? [];
    return HttpResponse.json({ sessions: list });
  })
);

// create session
handlers.push(
  http.post('*/api/sessions', async ({ request }) => {
    const body = await request.json() as any;
    const gid = body.group_id as string;
    const created = {
      id: `s-${Math.random().toString(36).slice(2, 7)}`,
      group_id: gid,
      title: body.title ?? 'New Session',
      start: body.start ?? '2030-01-01T10:00:00Z',
      creator_id: 'u1',
    };
    sessionsByGroup[gid] = [created, ...(sessionsByGroup[gid] ?? [])];
    return HttpResponse.json({ session: created });
  })
);

// delete session
handlers.push(
  http.delete('*/api/sessions/:id', ({ params }) => {
    const { id } = params as { id: string };
    for (const gid of Object.keys(sessionsByGroup)) {
      sessionsByGroup[gid] = sessionsByGroup[gid].filter(s => s.id !== id);
    }
    return HttpResponse.json({ ok: true });
  })
);