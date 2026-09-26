import { NextResponse } from "next/server";
import { retryPendingNotifications } from "@/lib/email";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await retryPendingNotifications());
}
