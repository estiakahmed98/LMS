import { notFound } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import CertificatePrintButton from "@/components/admin/CertificatePrintButton";
import { CertificatePreview } from "@/components/shared/CertificatePreview";
import { getAdminCertificateDetail } from "@/lib/admin-certificate-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requirePermission } from "@/lib/rbac";

export default async function AdminCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PermissionModule.CERTIFICATES, "export");
  const { id } = await params;
  const detail = await getAdminCertificateDetail(id);
  if (!detail) notFound();
  const { certificate, template } = detail;

  return (
    <AdminLayout title="Certificate">
      <div className="p-6 print:p-0">
        <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between print:hidden">
          <div>
            <h1 className="text-xl font-bold">Certificate Preview</h1>
            <p className="text-sm text-muted-foreground">
              {certificate.certificateNumber}
            </p>
          </div>
          <CertificatePrintButton />
        </div>

        {certificate.status === "REVOKED" ? (
          <div className="mx-auto mb-4 max-w-4xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
            Revoked certificate: {certificate.revocationReason}
          </div>
        ) : null}

        <CertificatePreview
          student={certificate.student}
          course={certificate.course}
          issuer={template.issuerName}
          certificateNumber={certificate.certificateNumber}
          issueDate={certificate.issueDate}
          fontFamily={template.fontFamily}
          directorSignatureUrl={template.directorSignatureUrl}
          officialSealUrl={template.officialSealUrl}
          accentColor={template.borderColor}
        />
      </div>
    </AdminLayout>
  );
}
