"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="rounded-2xl border border-shop-line p-8">
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">Admin</p>
      <h1 className="mt-3 text-2xl font-bold">This screen could not be loaded</h1>
      <p className="mt-2 max-w-xl text-sm text-shop-muted">
        The request to the admin API failed. Your session is still active; retry the screen, or sign
        in again if the problem continues.
      </p>
      <Button className="mt-6 h-10 rounded-full px-5" onClick={reset} type="button">
        Try again
      </Button>
    </section>
  );
}
