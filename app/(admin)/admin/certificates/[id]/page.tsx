import { notFound } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import CertificatePrintButton from "@/components/admin/CertificatePrintButton";
import {
  getAdminCertificateDetail,
} from "@/lib/admin-certificate-server";
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

        <article
          className="mx-auto max-w-4xl rounded-lg border-8 bg-white p-12 text-center text-gray-800 shadow-xl print:max-w-none print:shadow-none"
          style={{ borderColor: template.borderColor }}
        >
          <div className="border border-gray-300 p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.35em]">
              Certificate of Completion
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Certificate ID: {certificate.certificateNumber}
            </p>
            <p className="mt-10 text-gray-500">This is to certify that</p>
            <h2
              className={`mt-4 border-b border-gray-300 pb-4 text-4xl font-bold ${
                template.fontFamily === "SERIF_FORMAL" ? "font-serif" : ""
              }`}
            >
              {certificate.student}
            </h2>
            <p className="mt-8 text-gray-500">
              has successfully completed
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              {certificate.course}
            </h3>
            <p className="mt-4 text-sm text-gray-500">
              Issued on{" "}
              {new Date(certificate.issueDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="mt-16 flex items-end justify-between gap-8">
              <div className="w-40 text-center">
                {template.directorSignatureUrl ? (
                  <img
                    src={template.directorSignatureUrl}
                    alt="Director signature"
                    className="mx-auto h-14 max-w-36 object-contain"
                  />
                ) : (
                  <div className="h-14" />
                )}
                <p className="border-t border-gray-400 pt-2 text-xs">
                  Program Director
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: template.borderColor }}>
                {template.issuerName}
              </p>
              <div className="flex w-40 justify-center">
                {template.officialSealUrl ? (
                  <img
                    src={template.officialSealUrl}
                    alt="Official seal"
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 text-[10px] font-semibold uppercase"
                    style={{
                      borderColor: template.borderColor,
                      color: template.borderColor,
                    }}
                  >
                    Verified
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </AdminLayout>
  );
}
