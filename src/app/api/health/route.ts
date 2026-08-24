import { NextResponse } from "next/server";
import { UPLOADS_ENABLED } from "@/lib/uploads";

/**
 * Liveness probe.
 *
 * Deliberately does not touch the database: this answers "is the process up",
 * and a health check that fails while Neon's compute is waking would take a
 * healthy deployment down for a cold start.
 *
 * It also reports whether uploads are on, because "the photo button vanished"
 * is otherwise a confusing thing to debug from the outside.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      uploadsEnabled: UPLOADS_ENABLED,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
