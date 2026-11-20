"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import type { Staff } from "@/lib/admin/types";

export function StaffManager({
  staff,
  roleOptions,
  rolesAvailable,
  currentUserId,
}: {
  staff: Staff[];
  roleOptions: string[];
  rolesAvailable: boolean;
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"new" | Staff | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function deactivate(member: Staff) {
    if (!window.confirm(`Deactivate ${member.name}? Their sessions are revoked immediately.`)) {
      return;
    }

    setPendingId(member.id);
    const result = await adminRequest(`staff/${member.id}`, { method: "DELETE" });
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message || "Staff member deactivated.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <Button className="h-10 rounded-full px-5" onClick={() => setDialog("new")} type="button">
          Add staff
        </Button>
      </div>

      {!rolesAvailable ? (
        <p className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Your role cannot read the full role catalogue. The role list below is derived from
          existing staff; ask a Super Admin for the role list if a role is missing.
        </p>
      ) : null}

      {staff.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-shop-line px-6 py-10 text-center text-sm text-shop-muted">
          No staff accounts yet.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-shop-line rounded-2xl border border-shop-line">
          {staff.map((member) => (
            <li
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
              key={member.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {member.name}
                  {member.id === currentUserId ? (
                    <span className="ml-2 rounded-full bg-shop-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-shop-muted uppercase">
                      You
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-shop-muted">{member.email}</p>
                <p className="mt-1 text-xs text-shop-muted">
                  {member.roles.join(", ") || "No roles"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                    member.is_active
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-shop-surface text-shop-muted"
                  }`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  onClick={() => setDialog(member)}
                  type="button"
                >
                  Edit
                </button>
                {member.is_active ? (
                  <Button
                    className="h-8 rounded-full px-3 text-xs"
                    disabled={pendingId === member.id}
                    onClick={() => void deactivate(member)}
                    type="button"
                    variant="destructive"
                  >
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        description={
          dialog === "new"
            ? "The account is created as staff with the selected roles."
            : "Leave the password blank to keep the current one."
        }
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
        open={dialog !== null}
        title={dialog === "new" || dialog === null ? "Add staff" : `Edit ${dialog.name}`}
      >
        {dialog !== null ? (
          <StaffForm
            key={dialog === "new" ? "new" : `edit-${dialog.id}`}
            member={dialog === "new" ? undefined : dialog}
            onSaved={() => {
              setDialog(null);
              router.refresh();
            }}
            roleOptions={roleOptions}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function StaffForm({
  member,
  roleOptions,
  onSaved,
}: {
  member?: Staff;
  roleOptions: string[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [roles, setRoles] = useState<string[]>(member?.roles ?? []);
  const [isActive, setIsActive] = useState(member?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleRole(role: string, checked: boolean) {
    setRoles((current) =>
      checked ? [...current, role] : current.filter((value) => value !== role),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Record<string, string[]> = {};

    if (name.trim().length < 2) {
      nextErrors.name = ["Enter the staff member's name."];
    }

    if (!email.includes("@")) {
      nextErrors.email = ["Enter a valid email address."];
    }

    if (!member && password.length < 10) {
      nextErrors.password = ["Use at least 10 characters."];
    }

    if (password !== "" && password !== confirmation) {
      nextErrors.password_confirmation = ["Passwords do not match."];
    }

    if (roles.length === 0) {
      nextErrors.roles = ["Assign at least one role."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setPending(true);

    const body = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      roles,
      is_active: isActive,
      ...(password !== "" ? { password, password_confirmation: confirmation } : {}),
    };

    const result = member
      ? await adminRequest(`staff/${member.id}`, { method: "PATCH", body })
      : await adminRequest("staff", { method: "POST", body });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      return;
    }

    toast.success(result.message || (member ? "Staff member updated." : "Staff member created."));
    onSaved();
  }

  return (
    <form className="max-h-[65vh] space-y-4 overflow-y-auto pr-1" onSubmit={submit}>
      <FormError message={message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.name?.[0]} htmlFor="staff-name" label="Name">
          <Input
            className="h-10"
            id="staff-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field>
        <Field error={errors.email?.[0]} htmlFor="staff-email" label="Email">
          <Input
            className="h-10"
            id="staff-email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </Field>
        <Field htmlFor="staff-phone" label="Phone">
          <Input
            className="h-10"
            id="staff-phone"
            onChange={(event) => setPhone(event.target.value)}
            value={phone}
          />
        </Field>
        <Field
          error={errors.password?.[0]}
          hint={member ? "Leave blank to keep the current password." : "At least 10 characters."}
          htmlFor="staff-password"
          label="Password"
        >
          <Input
            autoComplete="new-password"
            className="h-10"
            id="staff-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </Field>
        <Field
          error={errors.password_confirmation?.[0]}
          htmlFor="staff-password-confirmation"
          label="Confirm password"
        >
          <Input
            autoComplete="new-password"
            className="h-10"
            id="staff-password-confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            value={confirmation}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Roles</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {roleOptions.map((role) => (
            <label className="flex items-center gap-2 text-sm" key={role}>
              <input
                checked={roles.includes(role)}
                className="size-4 accent-foreground"
                onChange={(event) => toggleRole(role, event.target.checked)}
                type="checkbox"
              />
              {role}
            </label>
          ))}
        </div>
        {errors.roles?.[0] ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {errors.roles[0]}
          </p>
        ) : null}
      </fieldset>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          checked={isActive}
          className="size-4 accent-foreground"
          onChange={(event) => setIsActive(event.target.checked)}
          type="checkbox"
        />
        Active account
      </label>

      <Button className="h-10 w-full rounded-full" disabled={pending} type="submit">
        {pending ? "Saving…" : member ? "Save changes" : "Create staff member"}
      </Button>
    </form>
  );
}
