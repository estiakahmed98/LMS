import { NextResponse } from "next/server";
import {
  getAdminCertificate,
  reissueCertificate,
  revokeCertificate,
} from "@/lib/admin-certificate-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const detailHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const certificate = await getAdminCertificate((await params).id);
  if (!certificate) {
    return NextResponse.json(
      { error: "Certificate not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ certificate });
};

const updateHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: "revoke" | "reissue";
      reason?: string;
    };
    const actorId = await getActorId();
    const certificate =
      body.action === "reissue"
        ? await reissueCertificate(id, actorId)
        : body.action === "revoke"
          ? await revokeCertificate(id, body.reason ?? "", actorId)
          : null;
    if (!certificate) {
      return NextResponse.json(
        { error: "Action must be revoke or reissue." },
        { status: 400 },
      );
    }
    return NextResponse.json({ certificate });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Certificate not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update certificate.",
      },
      { status: 400 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.CERTIFICATES,
  "view",
  detailHandler,
);
export const PATCH = withPermission(
  PermissionModule.CERTIFICATES,
  "edit",
  updateHandler,
);
