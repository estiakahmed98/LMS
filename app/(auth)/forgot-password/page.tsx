import PasswordRecoveryForm from "@/components/PasswordRecoveryForm";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <PasswordRecoveryForm mode="forgot" email={typeof params.email === "string" ? params.email : ""} callbackUrl={safeCallbackUrl(params.callbackUrl) ?? ""} />;
}
