/** PostgreSQL undefined_table / missing relation (e.g. schema not pushed). */
export function isMissingRelationError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "42P01") return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}
