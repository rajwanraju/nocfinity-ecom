"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import { categoryOptionLabel, type CategoryOption } from "@/lib/admin/catalog";
import { centsToDollars, dollarsToCents } from "@/lib/admin/format";
import type { Product } from "@/lib/api/types";

type Values = {
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  price: string;
  discount: string;
  stock: string;
  description: string;
  isActive: boolean;
};

function initialValues(product?: Product): Values {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.category ? String(product.category.id) : "",
    price: centsToDollars(product?.price),
    discount: centsToDollars(product?.discount_price),
    stock: product ? String(product.stock) : "0",
    description: product?.description ?? "",
    isActive: product?.is_active ?? true,
  };
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => initialValues(product));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editing = product !== undefined;

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Record<string, string[]> = {};
    const price = dollarsToCents(values.price);
    const discount = values.discount.trim() === "" ? null : dollarsToCents(values.discount);
    const stock = Number.parseInt(values.stock, 10);

    if (values.name.trim().length < 2) {
      nextErrors.name = ["Enter the product name."];
    }

    if (values.sku.trim().length < 2) {
      nextErrors.sku = ["Enter a unique SKU."];
    }

    if (!values.categoryId) {
      nextErrors.category_id = ["Choose a category."];
    }

    if (price === null) {
      nextErrors.price = ["Enter a price in dollars."];
    }

    if (values.discount.trim() !== "" && discount === null) {
      nextErrors.discount_price = ["Enter a valid discount price."];
    }

    if (discount !== null && price !== null && discount >= price) {
      nextErrors.discount_price = ["The discount price must be lower than the price."];
    }

    if (!Number.isFinite(stock) || stock < 0) {
      nextErrors.stock = ["Stock must be zero or more."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    const body = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      slug: values.slug.trim() || undefined,
      category_id: Number(values.categoryId),
      price,
      discount_price: discount,
      stock,
      description: values.description.trim() || null,
      is_active: values.isActive,
    };

    const result = editing
      ? await adminRequest<Product>(`products/${product.id}`, { method: "PATCH", body })
      : await adminRequest<Product>("products", { method: "POST", body });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(result.message || (editing ? "Product updated." : "Product created."));

    if (!editing && result.data?.id) {
      router.push(`/admin/products/${result.data.id}/edit`);
    }

    router.refresh();
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <FormError message={message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.name?.[0]} htmlFor="product-name" label="Name">
          <Input
            id="product-name"
            onChange={(event) => update("name", event.target.value)}
            value={values.name}
          />
        </Field>

        <Field error={errors.sku?.[0]} htmlFor="product-sku" label="SKU">
          <Input
            id="product-sku"
            onChange={(event) => update("sku", event.target.value)}
            value={values.sku}
          />
        </Field>

        <Field
          error={errors.slug?.[0]}
          hint="Leave blank to generate one from the name."
          htmlFor="product-slug"
          label="Slug"
        >
          <Input
            id="product-slug"
            onChange={(event) => update("slug", event.target.value)}
            value={values.slug}
          />
        </Field>

        <Field error={errors.category_id?.[0]} htmlFor="product-category" label="Category">
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            id="product-category"
            onChange={(event) => update("categoryId", event.target.value)}
            value={values.categoryId}
          >
            <option value="">Choose a category</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {categoryOptionLabel(option)}
              </option>
            ))}
          </select>
        </Field>

        <Field error={errors.price?.[0]} hint="In dollars." htmlFor="product-price" label="Price">
          <Input
            id="product-price"
            inputMode="decimal"
            onChange={(event) => update("price", event.target.value)}
            placeholder="0.00"
            value={values.price}
          />
        </Field>

        <Field
          error={errors.discount_price?.[0]}
          hint="Optional, in dollars."
          htmlFor="product-discount"
          label="Discount price"
        >
          <Input
            id="product-discount"
            inputMode="decimal"
            onChange={(event) => update("discount", event.target.value)}
            placeholder="0.00"
            value={values.discount}
          />
        </Field>

        <Field error={errors.stock?.[0]} htmlFor="product-stock" label="Stock">
          <Input
            id="product-stock"
            inputMode="numeric"
            onChange={(event) => update("stock", event.target.value)}
            value={values.stock}
          />
        </Field>

        <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium">
          <input
            checked={values.isActive}
            className="size-4 accent-foreground"
            onChange={(event) => update("isActive", event.target.checked)}
            type="checkbox"
          />
          Active and visible in the storefront
        </label>
      </div>

      <Field error={errors.description?.[0]} htmlFor="product-description" label="Description">
        <textarea
          className="min-h-40 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          id="product-description"
          onChange={(event) => update("description", event.target.value)}
          value={values.description}
        />
      </Field>

      <Button className="h-11 rounded-full px-6" disabled={pending} type="submit">
        {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
