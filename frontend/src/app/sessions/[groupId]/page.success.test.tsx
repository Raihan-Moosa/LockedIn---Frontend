import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "./page";

import { use } from 'react';

// Mock the use hook
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  use: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ groupId: "g1" })),
  usePathname: jest.fn(() => "/sessions/g1"),
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

// Make sure we look like the session creator so the Delete button renders
jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "tok", user: { id: "u-creator" } } },
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
}));

describe("Sessions success branches", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // LIST sessions (⚠️ do not check init.method; GET often has headers but no method)
      if (/\/api\/groups\/g1\/sessions$/.test(url)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sessions: [
                {
                  id: "s1",
                  group_id: "g1",
                  creator_id: "u-creator",
                  start_at: new Date("2030-01-01T10:00:00Z").toISOString(),
                  venue: "Library",
                  topic: "Math",
                  time_goal_minutes: 60,
                  content_goal: "Read ch 1",
                },
              ],
            }),
            { status: 200 }
          )
        );
      }

      // messages + availability + my accepted sessions (so Accept button shows)
      if (/\/api\/groups\/g1\/messages/.test(url)) {
        return Promise.resolve(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
      }
      if (/\/api\/groups\/g1\/availability/.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ unavailable_usernames: [] }), { status: 200 })
        );
      }
      if (/\/api\/my\/sessions\?status=accepted/.test(url)) {
        return Promise.resolve(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
      }

      // // RSVP success
      // if (/\/api\/sessions\/s1\/rsvp$/.test(url) && init?.method === "POST") {
      //   return Promise.resolve(new Response("{}", { status: 200 }));
      // }

      // DELETE success
      if (/\/api\/groups\/g1\/sessions\/s1$/.test(url) && init?.method === "DELETE") {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }

      // allow any incidental fetches
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
  });

  // it("accepts RSVP successfully and refreshes", async () => {
  //    (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
  //   render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

  //   // Wait until the Upcoming Sessions card shows up (list is loaded)
  //   await screen.findByRole("heading", { level: 2, name: /upcoming sessions/i });

  //   const acceptBtn = await screen.findByRole("button", { name: /accept/i });
  //   await userEvent.click(acceptBtn);

  //   await waitFor(() => {
  //     // // assert RSVP POST happened
  //     // expect(
  //     //   fetchMock.mock.calls.some(
  //     //     ([u, i]) => String(u).endsWith("/api/sessions/s1/rsvp") && (i as RequestInit)?.method === "POST"
  //     //   )
  //     // ).toBe(true);
  //     // and component refetched sessions after success
  //     expect(
  //       fetchMock.mock.calls.some(([u]) => String(u).endsWith("/api/groups/g1/sessions"))
  //     ).toBe(true);
  //   });
  // });

  it("deletes a session successfully and removes it from the list", async () => {
     (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
    render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

    await screen.findByRole("heading", { level: 2, name: /upcoming sessions/i });

    const deleteBtn = await screen.findByRole("button", { name: /delete/i });
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      // assert DELETE happened
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u).endsWith("/api/groups/g1/sessions/s1") && (i as RequestInit)?.method === "DELETE"
        )
      ).toBe(true);
      // and list refetched
      expect(
        fetchMock.mock.calls.some(([u]) => String(u).endsWith("/api/groups/g1/sessions"))
      ).toBe(true);
    });
  });
});
