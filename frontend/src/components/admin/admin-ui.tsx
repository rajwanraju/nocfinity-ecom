import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="shop-display mt-2 text-3xl sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm text-shop-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-shop-line bg-shop-surface p-5">
      <p className="text-[11px] font-semibold tracking-[1.5px] text-shop-muted uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-shop-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-shop-line", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shop-line px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-bold">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-shop-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-shop-line px-6 py-12 text-center">
      <h2 className="text-base font-bold">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-shop-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-shop-muted">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}

export function PermissionNotice({ permission }: { permission: string }) {
  return (
    <section className="rounded-2xl border border-shop-line p-8">
      <h1 className="text-xl font-bold">Not available for your role</h1>
      <p className="mt-2 max-w-xl text-sm text-shop-muted">
        This screen requires the{" "}
        <code className="rounded bg-shop-surface px-1.5 py-0.5 text-xs">{permission}</code>{" "}
        permission. Ask an administrator to update your role if you need access.
      </p>
    </section>
  );
}

export function ApiFailure({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4">
      <p className="text-sm font-semibold text-destructive">{message}</p>
      <p className="mt-1 text-xs text-shop-muted">
        Refresh the page to try again. If it keeps failing, check that the API is running.
      </p>
    </div>
  );
}
