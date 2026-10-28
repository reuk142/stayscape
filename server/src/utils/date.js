const DAY = 86400000;
export function parseYmd(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Object.assign(new Error('Use YYYY-MM-DD dates'), { status: 400 });
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw Object.assign(new Error('Invalid date'), { status: 400 });
  return date;
}
export function stayNights(checkIn, checkOut, max = 60) {
  const start = parseYmd(checkIn);
  const end = parseYmd(checkOut);
  const count = (end - start) / DAY;
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today) throw Object.assign(new Error('Check-in cannot be in the past'), { status: 400 });
  if (count < 1 || count > max) throw Object.assign(new Error(`Choose a stay of 1 to ${max} nights`), { status: 400 });
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * DAY).toISOString().slice(0, 10));
}
