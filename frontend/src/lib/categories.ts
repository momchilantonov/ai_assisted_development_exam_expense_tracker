import type { Category } from "../api/types";

export const CATEGORY_ICON: Record<Category, string> = {
  Food: "🍽️",
  Transport: "🚌",
  Shopping: "🛍️",
  Bills: "🧾",
  Entertainment: "🎬",
  Healthcare: "🩺",
  Other: "📦",
};

export function categoryClass(category: Category): string {
  return `cat-${category.toLowerCase()}`;
}

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function monthRange(offset: number, now = new Date()) {
  const first = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
  return { dateFrom: iso(first), dateTo: iso(last) };
}
