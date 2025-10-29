import { authFetch } from "./useAuthFetch";

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

import { supabase } from "@/lib/supabaseClient";

describe("authFetch", () => {
  it("throws without token", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
      data: { session: null } 
    });
    await expect(authFetch("/api/x")).rejects.toThrow(/Unauthorized/);
  });

  it("attaches Authorization header", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: "abc" } },
    });
    const globalFetch = jest
      .spyOn(global as typeof globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);
    await authFetch("/api/x", { method: "POST", body: JSON.stringify({}) });
    expect(globalFetch).toHaveBeenCalled();
    const [, init] = globalFetch.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers?.Authorization).toBe("Bearer abc");
    globalFetch.mockRestore();
  });
});