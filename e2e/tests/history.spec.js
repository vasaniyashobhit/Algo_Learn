import { expect, test } from '@playwright/test';
import { syncedAccount } from '../helpers/account.js';
import { STUCK_STATEMENT, STUCK_TITLE } from '../server/stuckFixture.js';

test('history delete: the row leaves at once, Undo brings it back, then it is deleted for good', async ({ page }) => {
  await syncedAccount(page, 'hist');
  await page.goto('/stuck');
  await page.getByLabel('Problem statement').fill(`${STUCK_TITLE}\n${STUCK_STATEMENT}`);
  await page.getByRole('button', { name: 'Get hints' }).click();
  await expect(page).toHaveURL(/\/stuck\/[a-f0-9]{24}$/);

  await page.getByRole('navigation').getByRole('link', { name: 'History' }).click();
  const remove = page.getByRole('button', { name: /^Delete .+ from your history$/ });
  await expect(remove).toHaveCount(1);

  // Undo inside the 5 s window: nothing is sent and the row comes back.
  await remove.click();
  await expect(remove).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(remove).toHaveCount(1);

  // Delete again and let the window pass: the DELETE goes out and survives a reload.
  const deleted = page.waitForResponse((res) => res.request().method() === 'DELETE' && res.url().includes('/api/v1/stuck/'));
  await remove.click();
  await expect(remove).toHaveCount(0);
  expect((await deleted).status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('heading', { name: /history/i }).first()).toBeVisible();
  await expect(remove).toHaveCount(0);
});
