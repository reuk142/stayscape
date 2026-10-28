import test from 'node:test';
import assert from 'node:assert/strict';
import { api, nightsBetween, utcToday } from './api.js';

test('nightsBetween treats checkout as an exclusive date', () => {
  assert.equal(nightsBetween('2030-10-20', '2030-10-23'), 3);
  assert.equal(nightsBetween('2030-10-20', '2030-10-20'), 0);
});

test('utcToday returns an ISO calendar date', () => {
  assert.match(utcToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('API sends cookie credentials and JSON headers', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/bookings'); assert.equal(options.credentials, 'include');
    assert.equal(options.headers['Content-Type'], 'application/json');
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  };
  assert.deepEqual(await api('/bookings', { method: 'POST', body: '{}' }), { ok: true });
});

test('binary uploads preserve their explicit content type', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers['Content-Type'], 'application/octet-stream');
    assert.ok(options.body instanceof Blob);
    return new Response('{}');
  };
  await api('/uploads', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob(['image']) });
});

test('API surfaces conflicts, network errors and invalid success responses', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({error:'Dates unavailable'}), {status:409});
  await assert.rejects(api('/bookings'), error => error.status === 409 && error.message === 'Dates unavailable');
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(api('/listings'), /Cannot connect/);
  globalThis.fetch = async () => new Response('<html>Wrong server</html>');
  await assert.rejects(api('/listings'), /invalid response/);
});

test('API preserves abort errors for cancelled searches', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
  await assert.rejects(api('/listings'), {name:'AbortError'});
});
