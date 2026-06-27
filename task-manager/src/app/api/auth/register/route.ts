import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/auth";
import type { AuthResponse, SafeUser } from "@/types/user";

const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  name: z.string().min(1, { message: "Name is required" }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { email, password, name } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { message: "Email already registered", code: "EMAIL_TAKEN" } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const safeUser: SafeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };

  const token = signToken({ userId: user.id });

  return NextResponse.json<AuthResponse>({ user: safeUser, token }, { status: 201 });
}
