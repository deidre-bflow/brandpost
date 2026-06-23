import { NextRequest, NextResponse } from "next/server";

/** POST /api/auth/facebook/delete
 *  Meta calls this when a user requests deletion of their data.
 *  Returns a confirmation URL as required by Meta's spec.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/data-deleted`,
    confirmation_code: "brandflow_data_deletion",
  });
}
