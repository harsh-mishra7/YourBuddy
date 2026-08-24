"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  burnTime,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/password";
import {
  createSession,
  currentSessionToken,
  destroyAllSessions,
  destroyCurrentSession,
} from "@/lib/session";
import { requireUser } from "@/lib/user";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import {
  changePasswordInput,
  normalizeEmail,
  safeNextPath,
  signInInput,
  signUpInput,
  type ActionResult,
  type AuthState,
} from "@/lib/validation";

/**
 * Account actions.
 *
 * Signup is open, so these are the one part of the app a stranger can reach.
 * That shapes everything here: rate limits on the way in, identical answers
 * for "wrong password" and "no such account", and constant-ish timing so the
 * form can't be turned into a list of who has an account.
 */

/** Best-effort client identity for rate limiting. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

function fieldErrorsOf(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// ============================================================
// Sign up
// ============================================================

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limit = rateLimit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many accounts created from here. Try again later." };
  }

  const parsed = signUpInput.safeParse({
    name: (formData.get("name") as string) ?? "",
    email: normalizeEmail((formData.get("email") as string) ?? ""),
    password: (formData.get("password") as string) ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  // A password that *is* the email survives the length rule and is the first
  // thing anyone would guess.
  if (password.toLowerCase().includes(email)) {
    return { fieldErrors: { password: ["Don't use your email as your password."] } };
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true },
    });
    userId = user.id;
  } catch (err) {
    // Unique violation on email. Two people racing the same address lands here
    // too, which is why this is caught rather than pre-checked.
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      return {
        fieldErrors: {
          email: ["That email already has an account. Sign in instead."],
        },
      };
    }
    return { error: "Could not create your account. Try again." };
  }

  await createSession(userId, await userAgent());

  // Outside the try: redirect works by throwing, and a catch would swallow it.
  redirect(safeNextPath((formData.get("next") as string) ?? "/"));
}

// ============================================================
// Sign in
// ============================================================

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail((formData.get("email") as string) ?? "");
  const ip = await clientIp();

  // Two limits doing different jobs: per-account stops one inbox being ground
  // down, per-IP stops one machine spraying many accounts.
  const perAccount = rateLimit(`login:${email}`, 8, 15 * 60 * 1000);
  const perIp = rateLimit(`login-ip:${ip}`, 40, 15 * 60 * 1000);
  if (!perAccount.ok || !perIp.ok) {
    const wait = Math.max(perAccount.retryAfterSeconds, perIp.retryAfterSeconds);
    return {
      error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute${
        wait > 60 ? "s" : ""
      }.`,
    };
  }

  const parsed = signInInput.safeParse({
    email,
    password: (formData.get("password") as string) ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    // Spend a verification's worth of time anyway, then give the same answer a
    // wrong password gets.
    await burnTime();
    return { error: "That email and password don't match." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "That email and password don't match." };
  }

  // Now that we know the password is right, quietly move it to current cost
  // parameters if it was hashed under weaker ones.
  if (needsRehash(user.passwordHash)) {
    const upgraded = await hashPassword(parsed.data.password);
    await prisma.user
      .update({ where: { id: user.id }, data: { passwordHash: upgraded } })
      .catch(() => {
        /* the sign-in itself succeeded; a failed upgrade can wait */
      });
  }

  resetRateLimit(`login:${email}`);
  await createSession(user.id, await userAgent());

  redirect(safeNextPath((formData.get("next") as string) ?? "/"));
}

// ============================================================
// Sign out
// ============================================================

export async function signOut(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

/** Ends every session, including this one — the "I lost my laptop" button. */
export async function signOutEverywhere(): Promise<void> {
  const user = await requireUser();
  await destroyAllSessions(user.id);
  await destroyCurrentSession();
  redirect("/login");
}

// ============================================================
// Account settings
// ============================================================

export async function updateProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();
  const name = ((formData.get("name") as string) ?? "").trim();

  if (!name) return { fieldErrors: { name: ["What should we call you?"] } };
  if (name.length > 80) return { fieldErrors: { name: ["That name is too long."] } };

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function changePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();

  const limit = rateLimit(`chpw:${user.id}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts. Try again shortly." };

  const parsed = changePasswordInput.safeParse({
    currentPassword: (formData.get("currentPassword") as string) ?? "",
    newPassword: (formData.get("newPassword") as string) ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    record?.passwordHash ?? null,
  );
  if (!valid) {
    return { fieldErrors: { currentPassword: ["That's not your current password."] } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // A password change is how you respond to someone else having had it — so it
  // has to end their sessions. Keep this one alive so you aren't logged out of
  // the tab you just typed into.
  const removed = await destroyAllSessions(user.id, await currentSessionToken());

  return {
    ok: true,
    message: removed
      ? `Password changed. Signed out of ${removed} other ${
          removed === 1 ? "device" : "devices"
        }.`
      : "Password changed.",
  };
}

/**
 * Delete the account and everything in it.
 *
 * Rows go by cascade, but stored files don't — they have to be swept
 * explicitly or the images and voice notes of a deleted account stay on disk.
 */
export async function deleteAccount(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();

  const password = (formData.get("password") as string) ?? "";
  const confirm = ((formData.get("confirm") as string) ?? "").trim();

  if (confirm !== user.email) {
    return { fieldErrors: { confirm: ["Type your email exactly to confirm."] } };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(password, record?.passwordHash ?? null))) {
    return { fieldErrors: { password: ["That's not your password."] } };
  }

  const attachments = await prisma.attachment.findMany({
    where: { userId: user.id },
    select: { storageKey: true },
  });
  for (const a of attachments) await storage.remove(a.storageKey);

  await prisma.user.delete({ where: { id: user.id } });

  redirect("/signup");
}

/** Revoke one session from the settings list. */
export async function revokeSession(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();

  const { count } = await prisma.session.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
  if (!count) return { ok: false, error: "That session is already gone." };

  revalidatePath("/settings");
  return { ok: true };
}
