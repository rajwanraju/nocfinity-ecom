import Link from "next/link";
import { UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { SignOutButton } from "./sign-out-button";

/**
 * Server-rendered account slot. Reading the session cookie happens at request
 * time, so the layout streams this behind Suspense.
 */
export async function AccountMenu() {
  const user = await getSessionUser("customer");

  if (!user) {
    return (
      <Link
        aria-label="Sign in"
        className="hidden size-9 place-items-center rounded-full transition hover:bg-shop-surface sm:grid"
        href="/login"
      >
        <UserRound aria-hidden="true" size={21} />
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="flex items-center gap-1">
      <Link
        aria-label={`Account for ${user.name}`}
        className="grid size-9 place-items-center rounded-full bg-shop-ink text-xs font-bold text-background"
        href="/account"
      >
        {initial}
      </Link>
      <SignOutButton endpoint="/api/auth/logout" redirectTo="/" />
    </div>
  );
}

export function AccountMenuFallback() {
  return <span aria-hidden="true" className="size-9 animate-pulse rounded-full bg-shop-surface" />;
}
