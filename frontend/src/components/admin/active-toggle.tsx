"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";

export function ActiveToggle({
  path,
  isActive,
  label,
}: {
  path: string;
  isActive: boolean;
  label: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !active;

    setPending(true);

    const result = await adminRequest(path, { method: "PATCH", body: { is_active: next } });

    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setActive(next);
    toast.success(result.message || `${label} ${next ? "activated" : "deactivated"}.`);
    router.refresh();
  }

  return (
    <button
      aria-checked={active}
      aria-label={`${active ? "Deactivate" : "Activate"} ${label}`}
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${
        active ? "bg-emerald-600" : "bg-shop-line"
      } disabled:opacity-50`}
      disabled={pending}
      onClick={() => void toggle()}
      role="switch"
      type="button"
    >
      <span
        className={`size-5 rounded-full bg-white shadow transition ${
          active ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
