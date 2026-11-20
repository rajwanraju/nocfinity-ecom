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
import { categoryOptionLabel, descendantIds, flattenCategories } from "@/lib/admin/catalog";
import type { Category } from "@/lib/api/types";

type Row = { category: Category; depth: number };

function flattenTree(tree: Category[], depth = 0): Row[] {
  return tree.flatMap((category) => [
    { category, depth },
    ...flattenTree(category.children ?? [], depth + 1),
  ]);
}

type Dialog = { mode: "create"; parentId: number | null } | { mode: "edit"; category: Category };

export function CategoryManager({ tree }: { tree: Category[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const rows = flattenTree(tree);
  const options = flattenCategories(tree);

  return (
    <div>
      <div className="flex justify-end">
        <Button
          className="h-10 rounded-full px-5"
          onClick={() => setDialog({ mode: "create", parentId: null })}
          type="button"
        >
          New category
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-shop-line px-6 py-10 text-center text-sm text-shop-muted">
          No categories yet. Create the first one to start the tree.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-shop-line rounded-2xl border border-shop-line">
          {rows.map(({ category, depth }) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              key={category.id}
              style={{ paddingLeft: `${16 + depth * 24}px` }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {depth > 0 ? (
                    <span aria-hidden="true" className="text-shop-muted">
                      ↳
                    </span>
                  ) : null}
                  {category.name}
                  {category.is_active ? null : (
                    <span className="rounded-full bg-shop-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-shop-muted uppercase">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="text-xs text-shop-muted">
                  /{category.slug} · sort {category.sort_order}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  onClick={() => setDialog({ mode: "create", parentId: category.id })}
                  type="button"
                >
                  Add child
                </button>
                <button
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  onClick={() => setDialog({ mode: "edit", category })}
                  type="button"
                >
                  Edit
                </button>
                <DeleteButton
                  confirmMessage={`Delete ${category.name}? Categories with children or products cannot be deleted.`}
                  path={`categories/${category.id}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        description={
          dialog?.mode === "edit"
            ? "Update the category details."
            : "Add a node to the category tree."
        }
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
        open={dialog !== null}
        title={dialog?.mode === "edit" ? "Edit category" : "New category"}
      >
        {dialog ? (
          <CategoryForm
            category={dialog.mode === "edit" ? dialog.category : undefined}
            key={
              dialog.mode === "edit" ? `edit-${dialog.category.id}` : `create-${dialog.parentId}`
            }
            onSaved={() => {
              setDialog(null);
              router.refresh();
            }}
            options={
              dialog.mode === "edit"
                ? options.filter((option) => !descendantIds(dialog.category).includes(option.id))
                : options
            }
            parentId={dialog.mode === "create" ? dialog.parentId : dialog.category.parent_id}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function CategoryForm({
  category,
  parentId,
  options,
  onSaved,
}: {
  category?: Category;
  parentId: number | null;
  options: ReturnType<typeof flattenCategories>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [parent, setParent] = useState(parentId ? String(parentId) : "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (name.trim().length < 2) {
      setErrors({ name: ["Enter a category name."] });
      return;
    }

    setPending(true);

    const body = {
      name: name.trim(),
      parent_id: parent ? Number(parent) : null,
      description: description.trim() || null,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
      is_active: isActive,
    };

    const result = category
      ? await adminRequest(`categories/${category.id}`, { method: "PATCH", body })
      : await adminRequest("categories", { method: "POST", body });

    setPending(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage(result.message);
      return;
    }

    toast.success(result.message || (category ? "Category updated." : "Category created."));
    onSaved();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError message={message} />

      <Field error={errors.name?.[0]} htmlFor="category-name" label="Name">
        <Input
          className="h-10"
          id="category-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </Field>

      <Field htmlFor="category-parent" label="Parent">
        <select
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          id="category-parent"
          onChange={(event) => setParent(event.target.value)}
          value={parent}
        >
          <option value="">Top level</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {categoryOptionLabel(option)}
            </option>
          ))}
        </select>
      </Field>

      <Field error={errors.description?.[0]} htmlFor="category-description" label="Description">
        <textarea
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          id="category-description"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="category-sort" label="Sort order">
          <Input
            className="h-10"
            id="category-sort"
            inputMode="numeric"
            onChange={(event) => setSortOrder(event.target.value)}
            value={sortOrder}
          />
        </Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium">
          <input
            checked={isActive}
            className="size-4 accent-foreground"
            onChange={(event) => setIsActive(event.target.checked)}
            type="checkbox"
          />
          Active
        </label>
      </div>

      <Button className="h-10 w-full rounded-full" disabled={pending} type="submit">
        {pending ? "Saving…" : category ? "Save changes" : "Create category"}
      </Button>
    </form>
  );
}
