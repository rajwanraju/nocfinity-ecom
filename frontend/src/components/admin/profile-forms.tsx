"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import type { Staff } from "@/lib/admin/types";

export function ProfileForm({ profile }: { profile: Staff }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (name.trim().length < 2) {
      setErrors({ name: ["Enter your name."] });
      return;
    }

    setPending(true);

    const result = await adminRequest("profile", {
      method: "PATCH",
      body: { name: name.trim(), email: email.trim(), phone: phone.trim() || null },
    });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      return;
    }

    toast.success(result.message || "Profile updated.");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError message={message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.name?.[0]} htmlFor="profile-name" label="Name">
          <Input
            className="h-10"
            id="profile-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field>
        <Field
          error={errors.email?.[0]}
          hint="Changing your email clears its verification."
          htmlFor="profile-email"
          label="Email"
        >
          <Input
            className="h-10"
            id="profile-email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </Field>
        <Field error={errors.phone?.[0]} htmlFor="profile-phone" label="Phone">
          <Input
            className="h-10"
            id="profile-phone"
            onChange={(event) => setPhone(event.target.value)}
            value={phone}
          />
        </Field>
      </div>
      <Button className="h-10 rounded-full px-5" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Record<string, string[]> = {};

    if (!currentPassword) {
      nextErrors.current_password = ["Enter your current password."];
    }

    if (password.length < 10) {
      nextErrors.password = ["Use at least 10 characters."];
    }

    if (password !== confirmation) {
      nextErrors.password_confirmation = ["Passwords do not match."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setPending(true);

    const result = await adminRequest("auth/change-password", {
      method: "POST",
      body: {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      },
    });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      return;
    }

    toast.success(result.message || "Password updated.");
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
    setErrors({});
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError message={message} />
      <Field
        error={errors.current_password?.[0]}
        htmlFor="profile-current-password"
        label="Current password"
      >
        <Input
          autoComplete="current-password"
          className="h-10"
          id="profile-current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          error={errors.password?.[0]}
          hint="At least 10 characters, mixed case, a number and a symbol."
          htmlFor="profile-new-password"
          label="New password"
        >
          <Input
            autoComplete="new-password"
            className="h-10"
            id="profile-new-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </Field>
        <Field
          error={errors.password_confirmation?.[0]}
          htmlFor="profile-confirm-password"
          label="Confirm new password"
        >
          <Input
            autoComplete="new-password"
            className="h-10"
            id="profile-confirm-password"
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            value={confirmation}
          />
        </Field>
      </div>
      <Button className="h-10 rounded-full px-5" disabled={pending} type="submit">
        {pending ? "Updating…" : "Change password"}
      </Button>
      <p className="text-xs text-shop-muted">
        Changing your password signs out your other sessions; this one stays active.
      </p>
    </form>
  );
}
