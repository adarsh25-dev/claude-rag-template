/** Escape string for safe use inside a RegExp character class or as a literal pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
