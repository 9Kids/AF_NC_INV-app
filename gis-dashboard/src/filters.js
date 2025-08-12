export function parseCsvInts(s) {
  if (!s) return [];
  return s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean).map(Number);
}
export function parseCsvStrings(s) {
  if (!s) return [];
  return s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
}
