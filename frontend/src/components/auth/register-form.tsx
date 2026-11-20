"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiEnvelope } from "@/lib/api/server";
import { safeNextPath } from "@/lib/auth/redirect";

type FieldErrors = Record<string, string[]>;

const fields = [
  { id: "register-name", name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { id: "register-email", name: "email", label: "Email", type: "email", autoComplete: "email" },
  {
    id: "register-phone",
    name: "phone",
    label: "Phone (optional)",
    type: "tel",
    autoComplete: "tel",
  },
  {
    id: "register-password",
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
  },
  {
    id: "register-password-confirmation",
    name: "password_confirmation",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
  },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: FieldErrors = {};

    if (values.name.trim().length < 2) {
      nextErrors.name = ["Enter your full name."];
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) {
      nextErrors.email = ["Enter a valid email address."];
    }

    if (values.password.length < 10) {
      nextErrors.password = ["Use at least 10 characters."];
    } else if (values.password !== values.password_confirmation) {
      nextErrors.password_confirmation = ["Passwords do not match."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
          password: values.password,
          password_confirmation: values.password_confirmation,
        }),
      });
      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Your account could not be created. Please try again.");
        setErrors(body?.errors ?? {});
        return;
      }

      router.replace(safeNextPath(searchParams.get("next"), "/account"));
      router.refresh();
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
      <h1 className="shop-display mt-3 text-4xl">Create account</h1>
      <p className="mt-3 text-sm text-shop-muted">
        Track orders, save your details, and check out faster.
      </p>

      <form className="mt-8 flex flex-col gap-5" noValidate onSubmit={onSubmit}>
        {message ? (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {message}
          </p>
        ) : null}

        {fields.map((field) => (
          <div className="flex flex-col gap-2" key={field.name}>
            <label className="text-sm font-medium" htmlFor={field.id}>
              {field.label}
            </label>
            <Input
              aria-describedby={errors[field.name] ? `${field.id}-error` : undefined}
              aria-invalid={errors[field.name] ? true : undefined}
              autoComplete={field.autoComplete}
              id={field.id}
              name={field.name}
              onChange={(event) => update(field.name, event.target.value)}
              type={field.type}
              value={values[field.name] ?? ""}
            />
            {errors[field.name]?.[0] ? (
              <p className="text-xs text-destructive" id={`${field.id}-error`}>
                {errors[field.name][0]}
              </p>
            ) : null}
          </div>
        ))}

        <Button className="mt-2 h-12 rounded-full text-sm" disabled={pending} type="submit">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-shop-muted">
        Already have an account?{" "}
        <Link className="font-semibold text-shop-ink underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
