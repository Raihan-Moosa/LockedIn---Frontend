// src/app/sessions/[groupId]/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import Page from "./page";
import { use } from 'react';

// Mock the use hook
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  use: jest.fn(),
}));

// Only mock what this page actually uses
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/sessions/g1"),
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: "token", user: { id: "u1" } } } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://example.com/file" } })),
      })),
    },
  },
}));

describe("Sessions/[groupId] page", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    // jsdom doesn't implement scrollTo – stub it
    (window.HTMLElement.prototype as unknown as { scrollTo: () => void }).scrollTo = function () {};
    global.fetch = fetchMock as typeof fetch;

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.match(/\/api\/groups\/g1\/sessions$/)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sessions: [
                {
                  id: "s1",
                  group_id: "g1",
                  creator_id: "u1",
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

      if (url.match(/\/api\/groups\/g1\/messages/)) {
        return Promise.resolve(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
      }

      if (url.match(/\/api\/my\/sessions\?status=accepted/)) {
        return Promise.resolve(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
      }

      if (url.match(/\/api\/groups\/g1\/availability/)) {
        return Promise.resolve(new Response(JSON.stringify({ unavailable_usernames: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response("{}", { status: 200 }));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders and loads sessions for the group", async () => {
     (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
    render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

    // H1 header (level 1 avoids the “multiple headings with /sessions/” issue)
    expect(
      screen.getByRole("heading", { level: 1, name: /group sessions/i })
    ).toBeInTheDocument();

    // Wait for initial fetches
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // Shows the session details
    expect(screen.getByText(/venue:\s*library/i)).toBeInTheDocument();
    expect(screen.getByText(/topic:\s*Math/i)).toBeInTheDocument();
  });
});
