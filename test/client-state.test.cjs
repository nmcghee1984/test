const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
// Compile client TS with the repository's compiler; inject only the platform storage/transport ports.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
let data = new Map(), readError = false, writeError = false, response;
const storage = { getItem: async (key) => { if (readError) throw Error('read failed'); return data.get(key) ?? null; },
  setItem: async (key, value) => { if (writeError) throw Error('write failed'); data.set(key, value); } };
const originalLoad = Module._load;
Module._load = function(id, ...args) {
  if (id === '@react-native-async-storage/async-storage') return storage;
  if (id === './apiConnection') return { API_URL: 'https://example.test', apiFetch: async () => { if (response instanceof Error) throw response; return { ok: true, json: async () => response }; } };
  return originalLoad.call(this, id, ...args);
};
const { parseSavedState, readSavedState, writeSavedState, defaultPreferences, createSampleDataSource } = require('../src/data/storage.ts');
const { cancelMatching, restoreReminders, createSerialQueue } = require('../src/data/stateLifecycle.ts');
const { isDiscoveryRecord, isDiscoveryPage, isDiscoveryStatus } = require('../src/data/validation.ts');
const { fetchDiscoveryPage } = require('../src/data/discovery.ts');
const { fetchAssistantStatus, askAssistant } = require('../src/data/assistant.ts');
const key = 'uofg-life:local-state:v1';
const state = (extra = {}) => parseSavedState(JSON.stringify({ preferences: defaultPreferences, ...extra }));
beforeEach(() => { data = new Map(); readError = false; writeError = false; response = null; });

test('partial legacy settings salvage valid fields without coercing malformed preferences', () => {
  const result = state({ preferences: { displayName: 'Nicholas', largerText: 'false', highContrast: 1, reducedMotion: null,
    eventRemindersEnabled: 'true', classReminderMinutes: '15', homeSections: ['saved', 7, 'unknown', 'saved'], unknown: true },
    savedPlaces: ['library', null], savedSpaces: false, reminders: { 'event:careers': 'native-id', bad: false }, dismissedNotice: 'false' });
  assert.deepEqual(result.preferences, { ...defaultPreferences, displayName: 'Nicholas', homeSections: ['saved'] });
  assert.deepEqual(result.savedPlaces, ['library']); assert.deepEqual(result.savedSpaces, []);
  assert.deepEqual(result.reminders, { 'event:careers': 'native-id' }); assert.equal(result.dismissedNotice, false);
});
test('valid preferences, intentional empty sections and reminder IDs survive restart', async () => {
  const saved = state({ preferences: { ...defaultPreferences, homeSections: [], classReminderMinutes: 15, eventRemindersEnabled: true }, reminders: { 'class:2030-01-01:lecture': 'native:1' } });
  await writeSavedState(saved); assert.deepEqual(await readSavedState(), saved);
  assert.deepEqual(saved.preferences.homeSections, []);
});
test('corrupt and incompatible root storage throws without deleting original data', async () => {
  for (const value of ['{broken', 'null', '[]', 'false']) {
    data.set(key, value); await assert.rejects(readSavedState()); assert.equal(data.get(key), value);
  }
});
test('failed reads/writes propagate and leave last saved data available', async () => {
  await writeSavedState(state()); const previous = data.get(key);
  readError = true; await assert.rejects(readSavedState(), /read failed/); readError = false;
  writeError = true; await assert.rejects(writeSavedState(state({ savedPlaces: ['new'] })), /write failed/);
  assert.equal(data.get(key), previous);
});
test('write queue preserves order, recovers after failure and saves latest preference', async () => {
  const queue = createSerialQueue(); let release; const seen = [];
  const first = queue(async () => { await new Promise(resolve => { release = resolve; }); seen.push('first'); throw Error('failure'); });
  const rejected = assert.rejects(first, /failure/);
  const second = queue(async () => { seen.push('second'); await writeSavedState(state({ savedPlaces: ['latest'] })); });
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(seen, []); release();
  await Promise.all([rejected, second]); assert.deepEqual(seen, ['first', 'second']); assert.deepEqual((await readSavedState()).savedPlaces, ['latest']);
});
test('partial cancellation removes successes and preserves failed IDs for retry', async () => {
  const port = { cancel: async (key) => { if (key === 'event:failed') throw Error('unavailable'); } };
  const result = await cancelMatching({ 'event:ok': '1', 'event:failed': '2', 'class:keep': '3' }, key => key.startsWith('event:'), port);
  assert.equal(result.failed, true); assert.deepEqual(result.reminders, { 'event:failed': '2', 'class:keep': '3' });
  const retry = await cancelMatching(result.reminders, key => key.startsWith('event:'), { cancel: async () => {} });
  assert.equal(retry.failed, false); assert.deepEqual(retry.reminders, { 'class:keep': '3' });
});
test('restart restores browser reminders without permission prompts and leaves native reminders alone', async () => {
  const campus = createSampleDataSource(); const item = Object.values(campus.timetable).flat()[0];
  const reminderKey = `class:2099-01-05:${item.id}`; const calls = [];
  const saved = state({ reminders: { [reminderKey]: `web:${reminderKey}`, 'event:unknown': 'native-id' } });
  const port = { cancel: async () => {}, schedule: async (...args) => { calls.push(args); return 'web:restored'; } };
  const result = await restoreReminders(saved, campus, true, port);
  assert.equal(calls.length, 1); assert.equal(calls[0][4], false);
  assert.equal(result.reminders[reminderKey], 'web:restored'); assert.equal(result.reminders['event:unknown'], 'native-id');
  calls.length = 0; await restoreReminders(saved, campus, false, port); assert.equal(calls.length, 0);
});
test('failed restoration and missing source data preserve IDs; expired known reminders retire', async () => {
  const campus = createSampleDataSource(); const item = Object.values(campus.timetable).flat()[0];
  const future = `class:2099-01-05:${item.id}`, expired = `class:2000-01-05:${item.id}`;
  const saved = state({ reminders: { [future]: 'web:future', [expired]: 'web:expired', 'class:broken': 'web:broken', 'event:careers': 'native:old' } });
  const result = await restoreReminders(saved, campus, true, { cancel: async () => { throw Error('cancel failed'); }, schedule: async () => { throw Error('permission denied'); } });
  assert.equal(result.reminders[future], 'web:future'); assert.equal(result.reminders[expired], undefined);
  assert.equal(result.reminders['class:broken'], 'web:broken'); assert.equal(result.reminders['event:careers'], 'native:old');
  assert.ok(result.message);
});
test('discovery validators reject malformed collections and optional render fields', () => {
  assert.equal(isDiscoveryRecord({}), false); assert.equal(isDiscoveryPage({ records: null }), false);
  assert.equal(isDiscoveryStatus({ sources: [null], recordCount: 1, indexUpdatedAt: null, coverage: '' }), false);
});
test('malformed live discovery falls back to validated cache; corrupt cache cannot mask failure', async () => {
  const valid = { records: [], total: 0, nextCursor: null, query: '', source: null, coverage: 'test', indexUpdatedAt: null, mode: 'LIVE' };
  response = valid; assert.equal((await fetchDiscoveryPage('', null)).mode, 'LIVE');
  response = { records: 'broken' }; assert.equal((await fetchDiscoveryPage('', null)).mode, 'CACHED');
  data.set('uofg-life:discovery-cache:v1:search:q=&cursor=0', '{"records":null}');
  await assert.rejects(fetchDiscoveryPage('', null), /unsupported data format/);
  readError = true; response = Error('offline'); await assert.rejects(fetchDiscoveryPage('', null), /offline/);
});
test('assistant null payload and nonboolean configured values fail safely', async () => {
  response = null; await assert.rejects(askAssistant('test'), /unsupported answer/);
  response = { configured: 'true', provider: 'OpenAI', model: 'test' }; await assert.rejects(fetchAssistantStatus(), /unsupported status/);
});

test('browser timer replacement and cancellation avoid duplicate notifications; invalid dates reject', async (t) => {
  const now = Date.now(); t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now });
  const notifications = [];
  const previous = global.Notification;
  global.Notification = class {
    static permission = 'granted';
    static async requestPermission() { return 'granted'; }
    constructor(title) { notifications.push(title); }
  };
  t.after(() => { if (previous === undefined) delete global.Notification; else global.Notification = previous; });
  const web = require('../src/data/reminders.web.ts');
  await assert.rejects(web.scheduleReminder('invalid', 'invalid', '', new Date('bad')), /already passed/);
  await web.scheduleReminder('same', 'old', '', new Date(now + 1000));
  await web.scheduleReminder('same', 'replacement', '', new Date(now + 2000));
  t.mock.timers.tick(1000); assert.deepEqual(notifications, []);
  t.mock.timers.tick(1000); assert.deepEqual(notifications, ['replacement']);
  await web.scheduleReminder('cancel', 'cancelled', '', new Date(now + 3000));
  await web.cancelReminder('cancel', 'web:cancel');
  t.mock.timers.tick(1000); assert.deepEqual(notifications, ['replacement']);
});
