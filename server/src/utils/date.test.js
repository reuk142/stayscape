import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYmd, stayNights } from './date.js';
test('invalid calendar dates cannot be booked', () => { assert.throws(() => parseYmd('2027-02-30')); assert.throws(() => parseYmd('2027-13-03')); });
test('check-out date is not occupied', () => { const days = stayNights('2030-10-20', '2030-10-23'); assert.deepEqual(days, ['2030-10-20','2030-10-21','2030-10-22']); });
test('reject invalid stay lengths', () => { assert.throws(() => stayNights('2030-10-20','2030-10-20')); assert.throws(() => stayNights('2030-10-23','2030-10-20')); });
