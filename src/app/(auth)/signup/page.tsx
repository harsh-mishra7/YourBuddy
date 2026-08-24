import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/user";
import { MIN_PASSWORD_LENGTH, safeNextPath } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  if (await getSessionUser()) redirect(target);

  return (
    <AuthForm
      mode="signup"
      next={target}
      minPasswordLength={MIN_PASSWORD_LENGTH}
    />
  );
}
