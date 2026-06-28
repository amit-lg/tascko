import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/types/user";

export type AuthedHandler = (
  req: NextRequest,
  context: { currentUser: SafeUser; params?: Record<string, string> }
) => Promise<NextResponse>;

function extractToken(req: NextRequest): string | null {
  // Prefer httpOnly cookie (browser requests); fall back to Bearer header (curl/tests)
  const cookie = req.cookies.get("token")?.value;
  if (cookie && cookie.length > 0) return cookie;

  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function verifyUser(handler: AuthedHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        { error: { message: "Missing or malformed Authorization header", code: "MISSING_TOKEN" } },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      ({ userId } = verifyToken(token));
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid or expired token", code: "INVALID_TOKEN" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: "User no longer exists", code: "USER_NOT_FOUND" } },
        { status: 401 }
      );
    }

    return handler(req, { currentUser: user, params: context?.params });
  };
}
