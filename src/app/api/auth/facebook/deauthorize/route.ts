import { NextRequest, NextResponse } from "next/server";

/** POST /api/auth/facebook/deauthorize
 *  Meta calls this when a user removes the app from their Facebook settings.
 *  We acknowledge receipt — full cleanup can be added later.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ success: true });
}
