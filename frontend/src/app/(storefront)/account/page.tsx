import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/server";
import type { AuthUser } from "@/lib/auth/handlers";

export default function AccountPage() {
  return (
    <div className="shop-container py-14 sm:py-20">
      <Suspense fallback={<AccountDetailsSkeleton />}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

async function AccountDetails() {
  const user = await getSessionUser("customer");

  if (!user) {
    redirect("/login?next=%2Faccount");
  }

  return (
    <>
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">Account</p>
      <h1 className="shop-display mt-3 text-4xl">Hello, {firstName(user)}</h1>
      <p className="mt-3 max-w-lg text-sm text-shop-muted">
        Your profile details are below. Orders, addresses, and order tracking appear here.
      </p>

      <dl className="mt-10 grid max-w-xl gap-4 rounded-2xl border border-shop-line p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold tracking-[1.5px] text-shop-muted uppercase">Name</dt>
          <dd className="mt-1 text-sm font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-[1.5px] text-shop-muted uppercase">
            Email
          </dt>
          <dd className="mt-1 text-sm font-medium break-all">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-[1.5px] text-shop-muted uppercase">
            Phone
          </dt>
          <dd className="mt-1 text-sm font-medium">{user.phone ?? "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-[1.5px] text-shop-muted uppercase">
            Member since
          </dt>
          <dd className="mt-1 text-sm font-medium">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </dd>
        </div>
      </dl>
    </>
  );
}

function firstName(user: AuthUser): string {
  return user.name.trim().split(/\s+/)[0] || "there";
}

function AccountDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-14 w-full max-w-xl" />
      <Skeleton className="mt-8 h-48 w-full max-w-xl" />
    </div>
  );
}
