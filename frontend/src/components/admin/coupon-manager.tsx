"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError } from "@/components/admin/admin-ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import {
  centsToDollars,
  dollarsToCents,
  formatDate,
  fromDateTimeInput,
  toDateTimeInput,
} from "@/lib/admin/format";
import type { Coupon } from "@/lib/admin/types";
import { formatMoney } from "@/lib/format/money";

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<Coupon | null | "new">(null);

  return (
    <div>
      <div className="flex justify-end">
        <Button className="h-10 rounded-full px-5" onClick={() => setEditing("new")} type="button">
          New coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-shop-line px-6 py-10 text-center text-sm text-shop-muted">
          No coupons yet.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-shop-line rounded-2xl border border-shop-line">
          {coupons.map((coupon) => (
            <li
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
              key={coupon.id}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {coupon.code}
                  {coupon.is_active ? null : (
                    <span className="rounded-full bg-shop-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-shop-muted uppercase">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-shop-muted">
                  {coupon.type === "percentage"
                    ? `${coupon.value}% off`
                    : `${formatMoney(coupon.value)} off`}
                  {coupon.min_order_amount ? ` · min ${formatMoney(coupon.min_order_amount)}` : ""}
                  {` · used ${coupon.used_count}${coupon.usage_limit ? `/${coupon.usage_limit}` : ""}`}
                </p>
                <p className="text-xs text-shop-muted">
                  {coupon.starts_at || coupon.expires_at
                    ? `${formatDate(coupon.starts_at)} → ${formatDate(coupon.expires_at)}`
                    : "No schedule"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  onClick={() => setEditing(coupon)}
                  type="button"
                >
                  Edit
                </button>
                <DeleteButton
                  confirmMessage={`Delete coupon ${coupon.code}?`}
                  path={`coupons/${coupon.id}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        description="Codes are stored uppercase."
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        open={editing !== null}
        title={editing === "new" || editing === null ? "New coupon" : `Edit ${editing.code}`}
      >
        {editing !== null ? (
          <CouponForm
            coupon={editing === "new" ? undefined : editing}
            key={editing === "new" ? "new" : `edit-${editing.id}`}
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function CouponForm({ coupon, onSaved }: { coupon?: Coupon; onSaved: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<"percentage" | "fixed">(coupon?.type ?? "percentage");
  const [value, setValue] = useState(
    coupon
      ? coupon.type === "percentage"
        ? String(coupon.value)
        : centsToDollars(coupon.value)
      : "",
  );
  const [minOrder, setMinOrder] = useState(centsToDollars(coupon?.min_order_amount));
  const [maxDiscount, setMaxDiscount] = useState(centsToDollars(coupon?.max_discount_amount));
  const [usageLimit, setUsageLimit] = useState(
    coupon?.usage_limit ? String(coupon.usage_limit) : "",
  );
  const [perUserLimit, setPerUserLimit] = useState(
    coupon?.per_user_limit ? String(coupon.per_user_limit) : "",
  );
  const [startsAt, setStartsAt] = useState(toDateTimeInput(coupon?.starts_at ?? null));
  const [expiresAt, setExpiresAt] = useState(toDateTimeInput(coupon?.expires_at ?? null));
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const couponValue = type === "percentage" ? Number.parseInt(value, 10) : dollarsToCents(value);

    if (code.trim() === "") {
      setErrors({ code: ["Enter a coupon code."] });
      return;
    }

    if (!couponValue || couponValue < 1) {
      setErrors({ value: ["Enter a value."] });
      return;
    }

    if (type === "percentage" && couponValue > 100) {
      setErrors({ value: ["A percentage cannot exceed 100."] });
      return;
    }

    setPending(true);

    const body = {
      code: code.trim().toUpperCase(),
      type,
      value: couponValue,
      min_order_amount: dollarsToCents(minOrder),
      max_discount_amount: type === "percentage" ? dollarsToCents(maxDiscount) : null,
      usage_limit: usageLimit ? Number.parseInt(usageLimit, 10) : null,
      per_user_limit: perUserLimit ? Number.parseInt(perUserLimit, 10) : null,
      starts_at: fromDateTimeInput(startsAt),
      expires_at: fromDateTimeInput(expiresAt),
      is_active: isActive,
    };

    const result = coupon
      ? await adminRequest(`coupons/${coupon.id}`, { method: "PATCH", body })
      : await adminRequest("coupons", { method: "POST", body });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      return;
    }

    toast.success(result.message || (coupon ? "Coupon updated." : "Coupon created."));
    onSaved();
    router.refresh();
  }

  return (
    <form className="max-h-[65vh] space-y-4 overflow-y-auto pr-1" onSubmit={submit}>
      <FormError message={message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.code?.[0]} htmlFor="coupon-code" label="Code">
          <Input
            className="h-10"
            id="coupon-code"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </Field>

        <Field htmlFor="coupon-type" label="Type">
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            id="coupon-type"
            onChange={(event) => setType(event.target.value as "percentage" | "fixed")}
            value={type}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </Field>

        <Field
          error={errors.value?.[0]}
          hint={type === "percentage" ? "Whole percent, 1–100." : "In dollars."}
          htmlFor="coupon-value"
          label="Value"
        >
          <Input
            className="h-10"
            id="coupon-value"
            inputMode="decimal"
            onChange={(event) => setValue(event.target.value)}
            value={value}
          />
        </Field>

        <Field
          error={errors.min_order_amount?.[0]}
          hint="Optional, in dollars."
          htmlFor="coupon-min"
          label="Minimum order"
        >
          <Input
            className="h-10"
            id="coupon-min"
            inputMode="decimal"
            onChange={(event) => setMinOrder(event.target.value)}
            value={minOrder}
          />
        </Field>

        {type === "percentage" ? (
          <Field
            error={errors.max_discount_amount?.[0]}
            hint="Optional cap, in dollars."
            htmlFor="coupon-max"
            label="Maximum discount"
          >
            <Input
              className="h-10"
              id="coupon-max"
              inputMode="decimal"
              onChange={(event) => setMaxDiscount(event.target.value)}
              value={maxDiscount}
            />
          </Field>
        ) : null}

        <Field htmlFor="coupon-usage" label="Total usage limit">
          <Input
            className="h-10"
            id="coupon-usage"
            inputMode="numeric"
            onChange={(event) => setUsageLimit(event.target.value)}
            placeholder="Unlimited"
            value={usageLimit}
          />
        </Field>

        <Field htmlFor="coupon-per-user" label="Per customer limit">
          <Input
            className="h-10"
            id="coupon-per-user"
            inputMode="numeric"
            onChange={(event) => setPerUserLimit(event.target.value)}
            placeholder="Unlimited"
            value={perUserLimit}
          />
        </Field>

        <Field error={errors.starts_at?.[0]} htmlFor="coupon-starts" label="Starts at">
          <Input
            className="h-10"
            id="coupon-starts"
            onChange={(event) => setStartsAt(event.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </Field>

        <Field error={errors.expires_at?.[0]} htmlFor="coupon-expires" label="Expires at">
          <Input
            className="h-10"
            id="coupon-expires"
            onChange={(event) => setExpiresAt(event.target.value)}
            type="datetime-local"
            value={expiresAt}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          checked={isActive}
          className="size-4 accent-foreground"
          onChange={(event) => setIsActive(event.target.checked)}
          type="checkbox"
        />
        Active
      </label>

      <Button className="h-10 w-full rounded-full" disabled={pending} type="submit">
        {pending ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
      </Button>
    </form>
  );
}
