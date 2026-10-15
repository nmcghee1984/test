const { test, expect } = require('@playwright/test');
test('unconnected timetable never presents sample classes or a free day', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Personal timetable unavailable', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Timetable', exact: true }).click();
  await expect(page.getByText('Timetable unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('A free day', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Human Computer Interaction', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page.getByText('Timetable unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('Human Computer Interaction', { exact: true })).toHaveCount(0);
});
