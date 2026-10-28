export function asyncHandler(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
export function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value)); }
export function requireId(value) { if (!isUuid(value)) fail('Invalid ID'); }
export function httpsImage(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.username === '' && u.password === '' && u.hostname !== 'localhost' && !u.hostname.endsWith('.local'); } catch { return false; }
}
