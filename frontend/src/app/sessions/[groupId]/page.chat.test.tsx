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

// Mock supabase storage so upload + public URL work
const uploadMock = jest.fn().mockResolvedValue({ data: { path: "files/abc.pdf" }, error: null });
const getPublicUrlMock = jest.fn(() => ({ data: { publicUrl: "https://cdn.local/abc.pdf" } }));

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "tok", user: { id: "u1" } } },
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  },
}));

describe("Sessions chat branches", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (/\/api\/groups\/g1\/sessions$/.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ sessions: [] }), { status: 200 })
        );
      }
      if (/\/api\/groups\/g1\/messages$/.test(url) && (!init || !init.method)) {
        // initial load of messages
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [] }), { status: 200 })
        );
      }
      if (/\/api\/groups\/g1\/availability$/.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ unavailable_usernames: [] }), { status: 200 })
        );
      }
      if (/\/api\/my\/sessions\?status=accepted/.test(url)) {
        return Promise.resolve(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
      }

      // When sending a message
      if (/\/api\/groups\/g1\/messages$/.test(url) && init?.method === "POST") {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }

      return Promise.resolve(new Response("{}", { status: 200 }));
    });
  });

  it("uploads a file and sends with attachment_url", async () => {
     (use as jest.Mock).mockReturnValue({ groupId: 'g1' });
    render(<Page params={Promise.resolve({ groupId: 'g1' })} />);

    // wait for chat section to be present
    await screen.findByRole("heading", { level: 2, name: /group chat/i });

    const textarea = screen.getByPlaceholderText(/write a message/i);
    await userEvent.type(textarea, "Here is a file");

    // directly select the input[type=file] (no label in component)
    const inputNode = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    await userEvent.upload(inputNode, file);

    const sendBtn = screen.getByRole("button", { name: /send/i });
    await userEvent.click(sendBtn);

    await waitFor(() => {
      // check upload called
      expect(uploadMock).toHaveBeenCalled();
      // check POST to messages happened and body contains attachment_url
      expect(
        fetchMock.mock.calls.some(([u, i]) => {
          if (!/\/api\/groups\/g1\/messages$/.test(String(u))) return false;
          const body = (i as RequestInit)?.body as string;
          try {
            const parsed = JSON.parse(body);
            return parsed.attachment_url === "https://cdn.local/abc.pdf";
          } catch {
            return false;
          }
        })
      ).toBe(true);
    });
  });
});
//render(<Page params={{ groupId: "g1" }} />);