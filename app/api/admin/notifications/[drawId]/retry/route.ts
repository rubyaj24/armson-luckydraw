import { NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { dispatchDrawNotification } from "@/lib/email";

export async function POST(
  _request: Request,
  context: { params: Promise<{ drawId: string }> },
) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const { drawId } = await context.params;
    await dispatchDrawNotification(drawId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 500);
  }
}
