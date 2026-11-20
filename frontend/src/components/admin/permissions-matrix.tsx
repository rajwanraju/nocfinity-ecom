"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, type FormEvent } from "react";
import { Field, FormError } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import type { PermissionGroup, Role } from "@/lib/admin/types";

function toRecord(roles: Role[]): Record<number, string[]> {
  return Object.fromEntries(roles.map((role) => [role.id, [...role.permissions].sort()]));
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * FR-RBAC-7: permission rows × role columns. The Super Admin column is
 * read-only; every other role saves its own permission list.
 */
export function PermissionsMatrix({ groups, roles }: { groups: PermissionGroup[]; roles: Role[] }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(() => toRecord(roles));
  const [saved, setSaved] = useState(() => toRecord(roles));
  const [pending, setPending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const changed = roles.filter(
    (role) => !role.is_system && !sameSet(assignments[role.id] ?? [], saved[role.id] ?? []),
  );

  function toggle(roleId: number, permission: string, checked: boolean) {
    setAssignments((current) => {
      const next = new Set(current[roleId] ?? []);

      if (checked) {
        next.add(permission);
      } else {
        next.delete(permission);
      }

      return { ...current, [roleId]: [...next].sort() };
    });
  }

  async function save() {
    if (changed.length === 0) {
      return;
    }

    setPending(true);

    const results = await Promise.all(
      changed.map((role) =>
        adminRequest(`roles/${role.id}`, {
          method: "PATCH",
          body: { permissions: assignments[role.id] ?? [] },
        }),
      ),
    );

    setPending(false);

    const failure = results.find((result) => !result.ok);

    if (failure && !failure.ok) {
      toast.error(failure.message);
      return;
    }

    setSaved(assignments);
    toast.success(`Saved ${changed.length} role${changed.length === 1 ? "" : "s"}.`);
    router.refresh();
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    if (newRoleName.trim().length < 2) {
      setCreateError("Enter a role name.");
      return;
    }

    setPending(true);

    const result = await adminRequest("roles", {
      method: "POST",
      body: { name: newRoleName.trim(), permissions: [] },
    });

    setPending(false);

    if (!result.ok) {
      setCreateError(result.message);
      return;
    }

    toast.success(result.message || "Role created.");
    setNewRoleName("");
    setCreating(false);
    router.refresh();
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Delete the ${role.name} role?`)) {
      return;
    }

    setPending(true);
    const result = await adminRequest(`roles/${role.id}`, { method: "DELETE" });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message || "Role deleted.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-shop-muted">
          {changed.length > 0
            ? `${changed.length} role${changed.length === 1 ? "" : "s"} with unsaved changes`
            : "Toggle a permission, then save."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-9 rounded-full px-4"
            onClick={() => setCreating(true)}
            type="button"
            variant="outline"
          >
            New role
          </Button>
          <Button
            className="h-9 rounded-full px-5"
            disabled={pending || changed.length === 0}
            onClick={() => void save()}
            type="button"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-shop-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-shop-line">
              <th
                className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-semibold tracking-wide text-shop-muted uppercase"
                scope="col"
              >
                Permission
              </th>
              {roles.map((role) => (
                <th className="min-w-40 px-3 py-3 align-top" key={role.id} scope="col">
                  <span className="block text-xs font-bold">{role.name}</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-shop-muted">
                    {role.staff_count} staff
                  </span>
                  {role.is_system ? (
                    <span className="mt-1 block text-[10px] text-shop-muted">System role</span>
                  ) : (
                    <button
                      className="mt-1 text-[10px] font-semibold text-destructive underline disabled:opacity-40"
                      disabled={pending}
                      onClick={() => void deleteRole(role)}
                      type="button"
                    >
                      Delete
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr>
                  <th
                    className="sticky left-0 z-10 bg-shop-surface px-4 py-2 text-[11px] font-bold tracking-wide uppercase"
                    colSpan={roles.length + 1}
                    scope="colgroup"
                  >
                    {group.label}
                  </th>
                </tr>
                {group.permissions.map((permission) => (
                  <tr className="border-t border-shop-line" key={permission.name}>
                    <th
                      className="sticky left-0 z-10 bg-background px-4 py-2.5 font-normal"
                      scope="row"
                    >
                      <span className="block text-sm">{permission.label}</span>
                      <code className="text-[10px] text-shop-muted">{permission.name}</code>
                    </th>
                    {roles.map((role) => {
                      const checked =
                        role.is_system || (assignments[role.id] ?? []).includes(permission.name);

                      return (
                        <td className="px-3 py-2.5 text-center" key={role.id}>
                          <input
                            aria-label={`${permission.label} for ${role.name}`}
                            checked={checked}
                            className="size-4 accent-foreground disabled:opacity-50"
                            disabled={role.is_system || pending}
                            onChange={(event) =>
                              toggle(role.id, permission.name, event.target.checked)
                            }
                            type="checkbox"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setCreateError(null);
          }
        }}
        open={creating}
        title="New role"
        description="Create the role, then toggle the permissions it should grant."
      >
        <form className="space-y-4" onSubmit={createRole}>
          <FormError message={createError} />
          <Field htmlFor="role-name" label="Role name">
            <Input
              className="h-10"
              id="role-name"
              onChange={(event) => setNewRoleName(event.target.value)}
              value={newRoleName}
            />
          </Field>
          <Button className="h-10 w-full rounded-full" disabled={pending} type="submit">
            {pending ? "Creating…" : "Create role"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
