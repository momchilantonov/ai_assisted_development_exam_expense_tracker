// Only same-origin relative paths are allowed as redirect targets.
export function safeNext(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/\\")
  )
    return raw;
  return "/";
}
