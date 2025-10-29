import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // no caching in dev
export const revalidate = 0;

export async function GET() {
  const upstream = "https://raceiq-api.onrender.com/api/races";

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const resp = await fetch(upstream, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(t);

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Upstream error ${resp.status}` },
        { status: 502 }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch F1 races" },
      { status: 500 }
    );
  }
}
