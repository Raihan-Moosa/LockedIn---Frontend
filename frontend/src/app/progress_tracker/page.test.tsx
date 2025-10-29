/**
 * Progress Tracker tests — aligned to UI strings and robust POST detection.
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "./page";

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "token-123" } },
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

beforeAll(() => {
  // Extra safety for charts
  global.ResizeObserver = global.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Progress Tracker", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
   global.fetch = fetchMock as typeof fetch;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // GET entries
      if (url.match(/\/api\/progress$/) && (!init || !init.method)) {
        return Promise.resolve(
          new Response(JSON.stringify({ entries: [] }), { status: 200 })
        );
      }

      // POST entry
      if (url.match(/\/api\/progress$/) && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              entry: {
                date: "2099-01-01",
                hours: 2,
                productivity: 3,
                notes: "",
              },
            }),
            { status: 200 }
          )
        );
      }

      // F1 proxy
      if (url.endsWith("/api/f1")) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }

      // Fallback
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
  });

  it("shows validation error initially and enables submit on valid hours", async () => {
    render(<Page />);

    const hours = await screen.findByLabelText(/hours/i);
    const logButton = screen.getByRole("button", { name: /log hours/i });

    // Initial helper text in your UI:
    await waitFor(() =>
      expect(
        screen.getByText(/enter hours \(number > 0\)\./i)
      ).toBeInTheDocument()
    );
    expect(logButton).toBeDisabled();

    await userEvent.type(hours, "2");
    await waitFor(() => expect(logButton).not.toBeDisabled());
  }, 10000);

  it("submits hours successfully", async () => {
    render(<Page />);

    const hours = await screen.findByLabelText(/hours/i);
    await userEvent.type(hours, "2");

    const notes = screen.getByLabelText(/notes/i);
    await userEvent.type(notes, "great session");

    const logButton = screen.getByRole("button", { name: /log hours/i });
    await userEvent.click(logButton);

    // ✅ Robust: search calls array for POST to /api/progress
    await waitFor(() => {
      const posted = fetchMock.mock.calls.some(([u, init]) =>
        /\/api\/progress$/.test(String(u)) && init?.method === "POST"
      );
      expect(posted).toBe(true);
    });
  }, 10000);

  it("shows alert on save failure", async () => {
    // Force POST failure
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.match(/\/api\/progress$/) && (!init || !init.method)) {
        return Promise.resolve(new Response(JSON.stringify({ entries: [] }), { status: 200 }));
      }
      if (url.match(/\/api\/progress$/) && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Failed to save" }), { status: 500 })
        );
      }
      if (url.endsWith("/api/f1")) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(<Page />);

    const hours = await screen.findByLabelText(/hours/i);
    await userEvent.type(hours, "1.5");

    const logButton = screen.getByRole("button", { name: /log hours/i });
    await userEvent.click(logButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  }, 10000);

  it("prevents zero or invalid hours and keeps error helper visible", async () => {
    render(<Page />);

    const hours = await screen.findByLabelText(/hours/i);
    const logButton = screen.getByRole("button", { name: /log hours/i });

    // Non-numeric -> your component continues to show the generic helper
    await userEvent.clear(hours);
    fireEvent.change(hours, { target: { value: "abc" } });
    await waitFor(() =>
      expect(screen.getByText(/enter hours \(number > 0\)\./i)).toBeInTheDocument()
    );
    expect(logButton).toBeDisabled();

    // Zero -> "Hours must be greater than 0."
    await userEvent.clear(hours);
    await userEvent.type(hours, "0");
    await waitFor(() =>
      expect(screen.getByText(/hours must be greater than 0/i)).toBeInTheDocument()
    );
    expect(logButton).toBeDisabled();
  }, 10000);
});
