"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  changePassword,
  deleteAccount,
  revokeSession,
  updateProfile,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { AuthState } from "@/lib/validation";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-danger">{messages[0]}</p>;
}

function FormAlert({ state }: { state: AuthState }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
      >
        {state.error}
      </p>
    );
  }
  if (state?.ok && state.message) {
    return (
      <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
        {state.message}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <div>
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          defaultValue={name}
          maxLength={80}
          required
        />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function PasswordForm({
  minPasswordLength,
}: {
  minPasswordLength: number;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError messages={state?.fieldErrors?.currentPassword} />
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
        />
        <FieldError messages={state?.fieldErrors?.newPassword} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          At least {minPasswordLength} characters. Changing it signs out every
          other device.
        </p>
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

export function RevokeButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="iconSm"
      title="Sign out this device"
      aria-label="Sign out this device"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeSession(sessionId);
          if (result.ok) toast.success("Signed that device out.");
          else toast.error(result.error);
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

/**
 * Deleting an account is irreversible and takes the journal with it, so it
 * asks for the password *and* the email typed out — a misclick can't do it.
 */
export function DeleteAccountForm({ email }: { email: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    deleteAccount,
    undefined,
  );

  if (!armed) {
    return (
      <Button variant="danger" size="sm" onClick={() => setArmed(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <div>
        <Label htmlFor="delete-confirm">
          Type <span className="normal-case">{email}</span> to confirm
        </Label>
        <Input
          id="delete-confirm"
          name="confirm"
          autoComplete="off"
          placeholder={email}
          required
        />
        <FieldError messages={state?.fieldErrors?.confirm} />
      </div>
      <div>
        <Label htmlFor="delete-password">Password</Label>
        <Input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Deleting…" : "Delete everything"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setArmed(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
