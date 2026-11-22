"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiEnvelope } from "@/lib/api/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { setFlash } from "@/lib/ui/flash";
import { navigateTo } from "@/lib/ui/navigation";

type LoginFormProps = {
  endpoint: "/api/auth/login" | "/api/admin/auth/login";
  redirectTo: string;
  title: string;
  description?: string;
};

type FieldErrors = Record<string, string[]>;

export function LoginForm({ endpoint, redirectTo, title, description }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = ["Enter your email address."];
    }

    if (!password) {
      nextErrors.password = ["Enter your password."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Sign in failed. Please try again.");
        setErrors(body?.errors ?? {});
        return;
      }

      setFlash("Signed in successfully.");

      // Full navigation: the client router caches the redirect the proxy
      // returned for this destination while the visitor was signed out, so a
      // client-side replace replays it and leaves them on /login.
      navigateTo(safeNextPath(searchParams.get("next"), redirectTo));
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
      <h1 className="shop-display mt-3 text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-sm text-shop-muted">{description}</p> : null}

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
          <label className="text-sm font-medium" htmlFor="login-email">
            Email
          </label>
          <Input
            aria-describedby={errors.email ? "login-email-error" : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            id="login-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.test"
            type="email"
            value={email}
          />
          {errors.email?.[0] ? (
            <p className="text-xs text-destructive" id="login-email-error">
              {errors.email[0]}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="login-password">
            Password
          </label>
          <Input
            aria-describedby={errors.password ? "login-password-error" : undefined}
            aria-invalid={errors.password ? true : undefined}
            autoComplete="current-password"
            id="login-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {errors.password?.[0] ? (
            <p className="text-xs text-destructive" id="login-password-error">
              {errors.password[0]}
            </p>
          ) : null}
        </div>

        <Button className="mt-2 h-12 rounded-full text-sm" disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {endpoint === "/api/auth/login" ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-shop-muted">
          <Link className="font-semibold text-shop-ink underline" href="/forgot-password">
            Forgot password?
          </Link>
          <Link className="font-semibold text-shop-ink underline" href="/register">
            Create account
          </Link>
        </div>
      ) : null}
    </div>
  );
}
