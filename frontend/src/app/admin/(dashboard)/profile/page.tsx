import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, Panel } from "@/components/admin/admin-ui";
import { ChangePasswordForm, ProfileForm } from "@/components/admin/profile-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";
import type { Staff } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Profile" };

export default function AdminProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        description="Your account details and password. Profile changes are recorded in the activity log."
        eyebrow="Account"
        title="Profile"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-96 w-full rounded-2xl" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const result = await adminGet<Staff>("profile");

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const profile = result.data;

  return (
    <div className="mt-8 space-y-6">
      <Panel title="Details">
        <ProfileForm profile={profile} />
      </Panel>

      <Panel title="Access">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-shop-muted">Roles</dt>
            <dd className="mt-1 font-medium">{profile.roles.join(", ") || "No roles"}</dd>
          </div>
          <div>
            <dt className="text-xs text-shop-muted">Permissions</dt>
            <dd className="mt-1 font-medium">{profile.permissions.length} granted</dd>
          </div>
          <div>
            <dt className="text-xs text-shop-muted">Email verified</dt>
            <dd className="mt-1 font-medium">
              {profile.email_verified_at
                ? formatDateTime(profile.email_verified_at)
                : "Not verified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-shop-muted">Member since</dt>
            <dd className="mt-1 font-medium">{formatDateTime(profile.created_at)}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Change password">
        <ChangePasswordForm />
      </Panel>
    </div>
  );
}
