import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimetableAdapter, parseTimetable } from './timetable.ts';
const occurrence = { id: 'synthetic-occurrence', classId: 'synthetic-class', title: 'Synthetic class', startsAt: '2026-10-25T09:00:00Z', endsAt: '2026-10-25T10:00:00Z', revision: '2', status: 'changed', location: { building: 'Synthetic building', room: 'R1', buildingId: 'B1' } };
const payload = { schemaVersion: 1, asOf: '2026-10-15T18:00:00Z', occurrences: [occurrence] };
test('dated occurrences, rooms, revisions and cancellations survive normalization', () => {
  for (const status of ['scheduled', 'changed', 'cancelled']) {
    const result = parseTimetable({ ...payload, occurrences: [{ ...occurrence, status, studentName: 'must be discarded' }] });
    assert.equal(result.mode, 'LIVE');
    assert.deepEqual(result.occurrences, [{ ...occurrence, status }]);
  }
});
test('empty successful timetable differs from unavailable', async () => {
  assert.equal(parseTimetable({ ...payload, occurrences: [] }).mode, 'LIVE');
  assert.equal((await createTimetableAdapter().load()).mode, 'UNAVAILABLE');
});
test('reject malformed, ambiguous dates, duplicates, unsupported schema and negative durations', () => {
  for (const input of [null, {}, { ...payload, schemaVersion: 2 }, { ...payload, occurrences: [occurrence, occurrence] }, ...[
    { startsAt: '2026-10-25T09:00:00' }, { endsAt: occurrence.startsAt }, { revision: '' }, { location: null }, { status: 'unknown' }, { id: '' },
  ].map(patch => ({ ...payload, occurrences: [{ ...occurrence, ...patch }] }))]) {
    assert.equal(parseTimetable(input).mode, 'UNAVAILABLE');
  }
});
test('auth and network failures expose no records or fallback sample data', async () => {
  for (const [status, reason] of [[401, 'sign-in-required'], [403, 'forbidden'], [500, 'service-error']]) {
    assert.deepEqual(await createTimetableAdapter(async () => ({ status, body: payload })).load(), { mode: 'UNAVAILABLE', reason, occurrences: [] });
  }
  assert.equal((await createTimetableAdapter(async () => { throw new Error('private'); }).load()).mode, 'UNAVAILABLE');
  assert.equal((await createTimetableAdapter(async () => ({ status: 200, body: payload })).load()).mode, 'LIVE');
});
