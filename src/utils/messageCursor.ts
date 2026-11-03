/** Compare decimal IDs without converting Java Long values to unsafe JS numbers. */
export function compareIds(a: string | number, b: string | number): number {
  const x = String(a).replace(/^0+(?=\d)/, '');
  const y = String(b).replace(/^0+(?=\d)/, '');
  return x.length - y.length || (x < y ? -1 : x > y ? 1 : 0);
}
export function mergeMessages<T extends { id: string | number }>(
  old: T[],
  incoming: T[],
): T[] {
  return [
    ...new Map(
      [...old, ...incoming].map((item) => [String(item.id), item]),
    ).values(),
  ].sort((a, b) => compareIds(a.id, b.id));
}
