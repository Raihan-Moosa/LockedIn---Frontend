import { GET } from "./route";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJson(res: any) {
  if (typeof res?.json === "function") {
    try { return await res.json(); } catch {}
  }
  if (typeof res?.text === "function") {
    try { const t = await res.text(); return t ? JSON.parse(t) : null; } catch {}
  }
  const body = (res && (res._bodyInit ?? res._body)) || null;
  if (body && typeof body === "string") {
    try { return JSON.parse(body); } catch {}
  }
  return null;
}

describe("GET /api/f1", () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it("returns 500 when upstream fails", async () => {
    const fetchSpy = jest.spyOn(global as typeof globalThis, "fetch").mockRejectedValue(new Error("boom"));
    const res = await GET();
    const json = await readJson(res);
    expect((res as Response).status).toBe(500);
    if (json) expect(String(json.error || "")).toMatch(/failed|error/i);
    fetchSpy.mockRestore();
  });

  it("returns 502 on non-ok", async () => {
    const fetchSpy = jest.spyOn(global as typeof globalThis, "fetch")
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    const res = await GET();
    const json = await readJson(res);
    expect((res as Response).status).toBe(502);
    if (json) expect(String(json.error || "")).toMatch(/error|upstream/i);
    fetchSpy.mockRestore();
  });

  it("returns data on success", async () => {
    const payload = [{ id: 1, name: "Australian Grand Prix", date: "2025-03-16" }];
    const fetchSpy = jest.spyOn(global as typeof globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => payload } as Response);
    const res = await GET();
    const json = await readJson(res);
    expect((res as Response).status).toBe(200);
    if (json) {
      expect(Array.isArray(json)).toBe(true);
      expect(json[0].name).toMatch(/Grand Prix/);
    }
    fetchSpy.mockRestore();
  });
});
