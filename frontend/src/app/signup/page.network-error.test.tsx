import { render, waitFor } from "@testing-library/react";
import Page from "./page";

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

describe("Signup network error branch", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock as typeof fetch;
    fetchMock.mockImplementation(() => {
      throw new Error("boom");
    });
  });

  it("handles thrown fetch", async () => {
    render(<Page />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
