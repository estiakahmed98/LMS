import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
    return NextResponse.json({ error: "This account is not active." }, { status: 403 });
  }

  return NextResponse.json({
    role: user.role,
    permissions: await getRolePermissions(user.role),
  });
}
