import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/verify-user";

export const GET = verifyUser(async (_req, { currentUser }) => {
  return NextResponse.json({ user: currentUser });
});
