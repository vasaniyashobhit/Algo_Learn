import { expect, test } from '@playwright/test';
import { syncedAccount } from '../helpers/account.js';

/** Holds matching requests until `release()` is called, to see the optimistic state. */
const holdRequests = async (page, method, pattern) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    if (route.request().method() !== method) return route.fallback();
    await gate;
    return route.fallback();
  });
  return () => release();
};

test('add to practice shows at once (optimistic) and lands in the practice list', async ({ page }) => {
  await syncedAccount(page, 'prac');
  const add = page.getByRole('button', { name: /^Add \d+\/[A-Z]\d* .+ to practice$/ }).first();
  const label = await add.getAttribute('aria-label');
  const id = label.match(/^Add (\S+)/)[1];

  const release = await holdRequests(page, 'POST', '**/api/v1/practice');
  await add.click();
  // The server has not answered yet, but the card already says it is in the list.
  await expect(page.getByRole('link', { name: `${id} is in your practice list. Open the list` }).first()).toBeVisible();
  release();
  await expect(page.getByText('Added').first()).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Practice' }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByText(id).first()).toBeVisible();
});

test('a failed add rolls back with a specific message', async ({ page }) => {
  await syncedAccount(page, 'roll');
  await page.route('**/api/v1/practice', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ status: 503, json: { success: false, error: { code: 'DB_UNAVAILABLE', message: 'x', details: null, requestId: 'e2e-1' } } })
    : route.fallback()));
  const add = page.getByRole('button', { name: /^Add \S+ .+ to practice$/ }).first();
  const label = await add.getAttribute('aria-label');
  await add.click();
  await expect(page.getByText(/couldn.t add/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});
