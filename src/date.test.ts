import assert from 'node:assert/strict';
import { daysUntil, formatLocalDate, formatLocalMonth } from './date.ts';

assert.equal(formatLocalDate(new Date(2026, 0, 2, 0, 30)), '2026-01-02');
assert.equal(formatLocalMonth(new Date(2026, 10, 30)), '2026-11');
assert.equal(daysUntil('2027-01-01', new Date(2026, 11, 31, 23, 59)), 1);
assert.equal(daysUntil('2026-12-30', new Date(2026, 11, 31)), -1);

console.log('date tests passed');
