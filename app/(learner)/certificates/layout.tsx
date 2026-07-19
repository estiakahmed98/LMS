import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerCertificatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLearner("/certificates", {
    module: "CERTIFICATES",
    action: "view",
  });
  return children;
}
