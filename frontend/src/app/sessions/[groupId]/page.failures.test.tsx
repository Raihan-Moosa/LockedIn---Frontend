import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "./page";

import { use } from 'react';

// Mock the use hook
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  use: jest.fn(),
}));



// Router mocks
jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ groupId: "g1" })),
  usePathname: jest.fn(() => "/sessions/g1"),
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

// Supabase mock – user is the creator so Delete button appears
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

describe("Sessions failure branches", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (window as Window & typeof globalThis).alert = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // sessions list
      if (url.match(/\/api\/groups\/g1\/sessions$/)) {
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
                  content_goal: "",
                },
              ],
            }),
            { status: 200 }
          )
        );
      }

      // messages
      if (url.match(/\/api\/groups\/g1\/messages/)) {
        return Promise.resolve(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
      }

      // my accepted sessions
      if (url.match(/\/api\/my\/sessions\?status=accepted/)) {
        return Promise.resolve(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
      }

      // availability
      if (url.match(/\/api\/groups\/g1\/availability/)) {
        return Promise.resolve(
          new Response(JSON.stringify({ unavailable_usernames: [] }), { status: 200 })
        );
      }

      // // RSVP FAILS
      // if (url.match(/\/api\/sessions\/s1\/rsvp$/) && init?.method === "POST") {
      //   return Promise.resolve(new Response(JSON.stringify({ error: "RSVP bad" }), { status: 500 }));
      // }

      // DELETE FAILS
      if (url.match(/\/api\/groups\/g1\/sessions\/s1$/) && init?.method === "DELETE") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Delete bad" }), { status: 500 })
        );
      }

      return Promise.resolve(new Response("{}", { status: 200 }));
    });
  });

  // it("shows alert when RSVP fails", async () => {
  //    (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
  //   render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

  //   // Wait for the list to render (async) and the Accept button to appear
  //   const acceptBtn = await screen.findByRole("button", { name: /accept/i });
  //   await userEvent.click(acceptBtn);

  //   await waitFor(() => {
  //     expect(window.alert).toHaveBeenCalled();
  //   });
  // });

  it("shows alert when delete fails", async () => {
     (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
    render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

    // Wait for delete button to render (creator sees it)
    const deleteBtn = await screen.findByRole("button", { name: /delete/i });
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });
});
