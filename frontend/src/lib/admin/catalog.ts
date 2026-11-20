import type { Category } from "@/lib/api/types";

export type CategoryOption = {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
};

export function flattenCategories(tree: Category[], depth = 0): CategoryOption[] {
  return tree.flatMap((category) => [
    { id: category.id, name: category.name, depth, parentId: category.parent_id },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

/** Ids of a category and everything below it; used to block cyclic parents. */
export function descendantIds(category: Category): number[] {
  return [category.id, ...(category.children ?? []).flatMap((child) => descendantIds(child))];
}

export function categoryOptionLabel(option: CategoryOption): string {
  return `${"— ".repeat(option.depth)}${option.name}`;
}
