"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiEnvelope } from "@/lib/api/server";

type FieldErrors = Record<string, string[]>;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrors({ email: ["Enter a valid email address."] });
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

      if (!response.ok) {
        setMessage(body?.message ?? "The reset link could not be sent. Please try again.");
        setErrors(body?.errors ?? {});
        return;
      }

      setSent(true);
      setMessage(
        body?.message ??
          "If an account exists for that email, a password reset link has been sent.",
      );
    } catch {
      setMessage("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
        Nocfinity
      </p>
      <h1 className="shop-display mt-3 text-4xl">Reset password</h1>
      <p className="mt-3 text-sm text-shop-muted">
        Enter your email and we will send a link to choose a new password. The link expires in 60
        minutes.
      </p>

      {sent ? (
        <p
          className="mt-8 rounded-xl border border-shop-line bg-shop-surface px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </p>
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
            <label className="text-sm font-medium" htmlFor="forgot-email">
              Email
            </label>
            <Input
              aria-describedby={errors.email ? "forgot-email-error" : undefined}
              aria-invalid={errors.email ? true : undefined}
              autoComplete="email"
              id="forgot-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.test"
              type="email"
              value={email}
            />
            {errors.email?.[0] ? (
              <p className="text-xs text-destructive" id="forgot-email-error">
                {errors.email[0]}
              </p>
            ) : null}
          </div>

          <Button className="mt-2 h-12 rounded-full text-sm" disabled={pending} type="submit">
            {pending ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-shop-muted">
        <Link className="font-semibold text-shop-ink underline" href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
