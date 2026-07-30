import { NextResponse } from "next/server";
import {
  getCertificateTemplate,
  updateCertificateTemplate,
} from "@/lib/admin-certificate-server";
import type { CertificateTemplateValue } from "@/lib/admin-certificate-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const getHandler = async () =>
  NextResponse.json({ template: await getCertificateTemplate() });

const updateHandler = async (request: Request) => {
  try {
    const input = (await request.json()) as Partial<CertificateTemplateValue>;
    const template = await updateCertificateTemplate(input, await getActorId());
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update certificate template.",
      },
      { status: 400 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.CERTIFICATES,
  "view",
  getHandler,
);
export const PATCH = withPermission(
  PermissionModule.CERTIFICATES,
  "edit",
  updateHandler,
);
