import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./lib/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const total = await prisma.auditLog.count();
console.log("total audit rows:", total);

const byEntity = await prisma.auditLog.groupBy({ by: ["entity"], _count: true, orderBy: { _count: { entity: "desc" } } });
console.log("\n=== by entity ===");
for (const r of byEntity) console.log(`  ${r.entity}: ${r._count}`);

const byAction = await prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { _count: { action: "desc" } } });
console.log("\n=== by action ===");
for (const r of byAction) console.log(`  ${r.action}: ${r._count}`);

const withNullActor = await prisma.auditLog.count({ where: { userId: null } });
console.log(`\nrows with no actor: ${withNullActor}`);

const withChanges = await prisma.auditLog.count({ where: { NOT: { changes: { equals: null } } } });
console.log(`rows with change payload: ${withChanges} / ${total}`);

const recent = await prisma.auditLog.findMany({ take: 3, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
console.log("\n=== 3 most recent ===");
for (const r of recent) console.log(`  ${r.createdAt.toISOString()} ${r.action} ${r.entity}/${r.entityId} by ${r.user?.name ?? "SYSTEM"}\n    changes=${JSON.stringify(r.changes)?.slice(0,160)}`);

await prisma.$disconnect();
