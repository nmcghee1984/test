const { test, expect } = require('@playwright/test');
const KEY = 'uofg-life:local-state:v1';
async function settings(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  return page.getByRole('textbox', { name: 'Name shown on the home screen' });
}

test('partial legacy state preserves recoverable preferences and favourites across restart', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      preferences: { displayName: 'Nicholas', largerText: true, highContrast: 'false', homeSections: [], classReminderMinutes: 15 },
      savedPlaces: ['library'], reminders: {},
    }));
  }, KEY);
  const name = await settings(page);
  await expect(name).toHaveValue('Nicholas');
  await expect(page.getByRole('switch', { name: 'Larger text' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Higher contrast' })).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).savedPlaces, KEY)).toEqual(['library']);
  await page.reload();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(name).toHaveValue('Nicholas');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).preferences.homeSections, KEY)).toEqual([]);
});

test('corrupt JSON stays available for recovery despite preference edits', async ({ page }) => {
  await page.addInitScript(key => { localStorage.setItem(key, '{corrupt'); }, KEY);
  const name = await settings(page);
  await expect(page.getByText(/Changes will not replace saved settings/)).toBeVisible();
  await name.fill('New name');
  await expect(name).toHaveValue('New name');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{corrupt');
});

test('failed storage read does not overwrite saved preferences', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ preferences: { displayName: 'Keep me' } }));
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function(name) { if (name === key) throw Error('read unavailable'); return get.call(this, name); };
  }, KEY);
  const name = await settings(page);
  await expect(page.getByText(/Changes will not replace saved settings/)).toBeVisible();
  await name.fill('Temporary');
  expect(await page.evaluate(key => JSON.parse(localStorage[key]).preferences.displayName, KEY)).toBe('Keep me');
});

test('failed storage write reports failure and a later edit can be saved', async ({ page }) => {
  await page.addInitScript(key => {
    const set = Storage.prototype.setItem;
    window.failSavedWrites = true;
    Storage.prototype.setItem = function(name, value) {
      if (name === key && window.failSavedWrites) throw Error('write unavailable');
      return set.call(this, name, value);
    };
  }, KEY);
  const name = await settings(page);
  await expect(page.getByText('Changes could not be saved on this device.')).toBeVisible();
  await page.evaluate(() => { window.failSavedWrites = false; });
  await name.fill('Recovered');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).preferences.displayName, KEY)).toBe('Recovered');
  await expect(page.getByText('Changes could not be saved on this device.')).toHaveCount(0);
});

test('restart retains unavailable browser reminder and Settings can cancel it without a permission prompt', async ({ page }) => {
  await page.addInitScript(key => {
    class Notifications {
      static permission = 'granted';
      static requestPermission() { window.permissionPrompts++; return Promise.resolve('granted'); }
    }
    window.permissionPrompts = 0;
    Object.defineProperty(window, 'Notification', { configurable: true, value: Notifications });
  }, KEY);
  await page.goto('/');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), KEY)).not.toBeNull();
  await page.getByRole('tab', { name: 'Timetable' }).click();
  // An unknown future event remains recoverable while events have no connected data.
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    state.reminders = { 'event:future-unavailable': 'web:event:future-unavailable' };
    state.preferences.eventRemindersEnabled = true;
    localStorage.setItem(key, JSON.stringify(state));
  }, KEY);
  await page.reload();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('switch', { name: 'Event reminders' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => window.permissionPrompts)).toBe(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).reminders, KEY)).toEqual({ 'event:future-unavailable': 'web:event:future-unavailable' });
  await page.getByRole('switch', { name: 'Event reminders' }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).reminders, KEY)).toEqual({});
});

test('edits while storage loads retain unrelated saved preferences', async ({ page }) => {
  await page.addInitScript(key => {
    const saved = JSON.stringify({ preferences: { displayName: 'Loaded name', largerText: true, classReminderMinutes: 15 }, savedPlaces: ['library'] });
    localStorage.setItem(key, saved);
    const get = Storage.prototype.getItem;
    let first = true;
    Storage.prototype.getItem = function(name) {
      if (name === key && first) {
        first = false;
        return new Promise(resolve => { window.finishSavedRead = () => resolve(saved); });
      }
      return get.call(this, name);
    };
  }, KEY);
  const name = await settings(page);
  await name.fill('Edited first');
  await page.evaluate(() => window.finishSavedRead());
  await expect(name).toHaveValue('Edited first');
  await expect(page.getByRole('switch', { name: 'Larger text' })).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).preferences.displayName, KEY)).toBe('Edited first');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).savedPlaces, KEY)).toEqual(['library']);
});
