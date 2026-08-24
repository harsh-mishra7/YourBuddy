"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import type { AuthState } from "@/lib/validation";

/**
 * Sign in and sign up are the same form with one extra field, so they are one
 * component — two files would drift the moment either got a fix.
 */

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-danger">{messages[0]}</p>;
}

export function AuthForm({
  mode,
  next,
  minPasswordLength,
}: {
  mode: "signin" | "signup";
  next: string;
  minPasswordLength: number;
}) {
  const isSignUp = mode === "signup";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isSignUp ? signUp : signIn,
    undefined,
  );

  return (
    <Card className="p-5">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {state?.error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        ) : null}

        {isSignUp ? (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="What should we call you?"
              required
              maxLength={80}
            />
            <FieldError messages={state?.fieldErrors?.name} />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            autoFocus={!isSignUp}
          />
          <FieldError messages={state?.fieldErrors?.email} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? minPasswordLength : undefined}
          />
          <FieldError messages={state?.fieldErrors?.password} />
          {isSignUp ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              At least {minPasswordLength} characters. Length matters more than
              symbols — a short phrase beats <code>P@ssw0rd</code>.
            </p>
          ) : null}
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending
            ? isSignUp
              ? "Creating your account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link
          href={isSignUp ? "/login" : "/signup"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Card>
  );
}
