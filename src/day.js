const RESET_HOUR = 8;

// The pull day a moment belongs to, as "YYYY-MM-DD". Days start at 08:00 local
// time. Uses calendar fields rather than subtracting hours, so DST is harmless.
export function dayKey(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() < RESET_HOUR) d.setDate(d.getDate() - 1);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
