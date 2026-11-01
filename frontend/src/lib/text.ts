export const MAX_DISPLAY_CHARS = 90;

/** Display-only: first `max` code points, then "…" when longer. */
export function truncateText(text: string, max = MAX_DISPLAY_CHARS): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text;
}
