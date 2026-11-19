"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

type SignOutButtonProps = {
  endpoint: "/api/auth/logout" | "/api/admin/auth/logout";
  redirectTo: string;
};

export function SignOutButton({ endpoint, redirectTo }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await fetch(endpoint, { method: "POST", credentials: "same-origin" });
    } finally {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      aria-label="Sign out"
      className="grid size-9 place-items-center rounded-full text-shop-muted transition hover:bg-background hover:text-foreground disabled:opacity-50"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      <LogOut aria-hidden="true" size={17} />
    </button>
  );
}
