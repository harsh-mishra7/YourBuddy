import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/user";
import { MIN_PASSWORD_LENGTH, safeNextPath } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  // A real session lookup, not the cookie glance `proxy.ts` does. Bouncing
  // signed-in visitors from the proxy would loop forever on a cookie whose
  // session was deleted server-side; checking the database here cannot.
  if (await getSessionUser()) redirect(target);

  return (
    <AuthForm
      mode="signin"
      next={target}
      minPasswordLength={MIN_PASSWORD_LENGTH}
    />
  );
}
