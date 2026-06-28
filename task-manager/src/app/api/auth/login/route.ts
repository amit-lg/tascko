import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/auth";
import type { AuthResponse, SafeUser } from "@/types/user";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" } },
      { status: 401 }
    );
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" } },
      { status: 401 }
    );
  }

  const safeUser: SafeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };

  const token = signToken({ userId: user.id });

  const response = NextResponse.json<AuthResponse>({ user: safeUser, token }, { status: 200 });
  response.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
