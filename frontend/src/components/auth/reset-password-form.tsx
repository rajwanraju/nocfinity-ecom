"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiEnvelope } from "@/lib/api/server";

type FieldErrors = Record<string, string[]>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: FieldErrors = {};

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      nextErrors.email = ["Enter a valid email address."];
    }

    if (password.length < 10) {
      nextErrors.password = ["Use at least 10 characters."];
    } else if (password !== confirmation) {
      nextErrors.password_confirmation = ["Passwords do not match."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim(),
          password,
          password_confirmation: confirmation,
        }),
      });
      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Your password could not be reset. Please try again.");
        setErrors(body?.errors ?? {});
        return;
      }

      setDone(true);
      setMessage(body?.message ?? "Password reset successfully. Please sign in.");
    } catch {
      setMessage("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (token === "") {
    return (
      <div className="mx-auto w-full max-w-md">
        <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
          Nocfinity
        </p>
        <h1 className="shop-display mt-3 text-4xl">Reset password</h1>
        <p
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          This reset link is invalid or has expired.
        </p>
        <p className="mt-6 text-sm text-shop-muted">
          <Link className="font-semibold text-shop-ink underline" href="/forgot-password">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
        Nocfinity
      </p>
      <h1 className="shop-display mt-3 text-4xl">Choose a new password</h1>
      <p className="mt-3 text-sm text-shop-muted">
        Use at least 10 characters with mixed case, a number, and a symbol.
      </p>

      {done ? (
        <>
          <p
            className="mt-8 rounded-xl border border-shop-line bg-shop-surface px-4 py-3 text-sm"
            role="status"
          >
            {message}
          </p>
          <p className="mt-6 text-sm text-shop-muted">
            <Link className="font-semibold text-shop-ink underline" href="/login">
              Sign in with your new password
            </Link>
          </p>
        </>
      ) : (
        <form className="mt-8 flex flex-col gap-5" noValidate onSubmit={onSubmit}>
          {message ? (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="reset-email">
              Email
            </label>
            <Input
              aria-describedby={errors.email ? "reset-email-error" : undefined}
              aria-invalid={errors.email ? true : undefined}
              autoComplete="email"
              id="reset-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            {errors.email?.[0] ? (
              <p className="text-xs text-destructive" id="reset-email-error">
                {errors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="reset-password">
              New password
            </label>
            <Input
              aria-describedby={errors.password ? "reset-password-error" : undefined}
              aria-invalid={errors.password ? true : undefined}
              autoComplete="new-password"
              id="reset-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            {errors.password?.[0] ? (
              <p className="text-xs text-destructive" id="reset-password-error">
                {errors.password[0]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="reset-password-confirmation">
              Confirm new password
            </label>
            <Input
              aria-describedby={
                errors.password_confirmation ? "reset-password-confirmation-error" : undefined
              }
              aria-invalid={errors.password_confirmation ? true : undefined}
              autoComplete="new-password"
              id="reset-password-confirmation"
              name="password_confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
            {errors.password_confirmation?.[0] ? (
              <p className="text-xs text-destructive" id="reset-password-confirmation-error">
                {errors.password_confirmation[0]}
              </p>
            ) : null}
          </div>

          <Button className="mt-2 h-12 rounded-full text-sm" disabled={pending} type="submit">
            {pending ? "Saving…" : "Reset password"}
          </Button>
        </form>
      )}
    </div>
  );
}
