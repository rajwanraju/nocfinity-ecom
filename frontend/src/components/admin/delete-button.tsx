"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";

export function DeleteButton({
  path,
  confirmMessage,
  label = "Delete",
  redirectTo,
}: {
  path: string;
  confirmMessage: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setPending(true);

    const result = await adminRequest(path, { method: "DELETE" });

    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message || "Deleted.");

    if (redirectTo) {
      router.push(redirectTo);
    }

    router.refresh();
  }

  return (
    <Button
      className="h-8 rounded-full px-3 text-xs"
      disabled={pending}
      onClick={() => void remove()}
      type="button"
      variant="destructive"
    >
      {pending ? "Deleting…" : label}
    </Button>
  );
}
