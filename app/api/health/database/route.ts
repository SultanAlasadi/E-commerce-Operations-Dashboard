export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  try {
    const { getPrisma } = await import("@/lib/prisma");
    const rows = await getPrisma().$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    return Response.json({ ok: rows[0]?.ok === 1 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
