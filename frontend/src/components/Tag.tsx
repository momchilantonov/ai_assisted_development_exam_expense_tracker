import type { Category } from "../api/types";
import { CATEGORY_ICON, categoryClass } from "../lib/categories";

export function Tag({ category }: { category: Category }) {
  return (
    <span className={`tag ${categoryClass(category)}`} data-icon={CATEGORY_ICON[category]}>
      {category}
    </span>
  );
}
