import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function auditLogEntry({
  actorId,
  action,
  entity,
  entityId,
  changes,
}: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  changes?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      userId: actorId,
      action,
      entity,
      entityId,
      changes:
        changes === undefined
          ? undefined
          : (JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonValue),
    },
  });
}
