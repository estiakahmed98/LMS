import type { Metadata } from "next";
import PasswordRecoveryForm from "@/components/PasswordRecoveryForm";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <PasswordRecoveryForm mode="reset" token={typeof params.token === "string" ? params.token : ""} callbackUrl={safeCallbackUrl(params.callbackUrl) ?? ""} />;
}
