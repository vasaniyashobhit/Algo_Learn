import { expect, test } from '@playwright/test';
import { syncedAccount } from '../helpers/account.js';
import { AI_OUTAGE_MARKER, STUCK_STATEMENT, STUCK_TITLE } from '../server/stuckFixture.js';

const askForHints = async (page, text) => {
  await page.getByRole('navigation').getByRole('link', { name: "I'm stuck" }).click();
  await expect(page).toHaveURL(/\/stuck$/);
  await page.getByLabel('Problem statement').fill(text);
  await page.getByRole('button', { name: 'Get hints' }).click();
  await expect(page).toHaveURL(/\/stuck\/[a-f0-9]{24}$/);
};

test('stuck with text → hints one at a time → full solution', async ({ page }) => {
  await syncedAccount(page, 'stuck');
  await askForHints(page, `${STUCK_TITLE}\n${STUCK_STATEMENT}`);

  await expect(page.getByRole('heading', { name: STUCK_TITLE })).toBeVisible();
  const hints = page.getByRole('list', { name: 'Hints' }).getByRole('listitem');
  await expect(hints).toHaveCount(1);
  await expect(hints.first()).toContainText('brackets are still open');

  await page.getByRole('button', { name: /Next hint/ }).click();
  await expect(hints).toHaveCount(2);
  await expect(hints.nth(1)).toBeFocused();
  await page.getByRole('button', { name: /Next hint/ }).click();
  await expect(hints).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Next hint/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Show full solution' }).click();
  await expect(page.getByText('O(n) time, O(1) memory')).toBeVisible();
  await expect(page.getByRole('button', { name: /Copy code/i })).toBeVisible();
  await expect(page.getByText(/Editorial for Balanced Bracket Splits/)).toBeVisible();
  await page.getByRole('button', { name: 'Hide solution' }).click();
  await expect(page.getByText('O(n) time, O(1) memory')).toHaveCount(0);
});

test('when the AI fails, the result is never blank: fallback notice and useful data', async ({ page }) => {
  await syncedAccount(page, 'fall');
  const text = `${AI_OUTAGE_MARKER} Greedy coins: you have coins of several values and must pay n with the fewest coins.`;
  await askForHints(page, text);

  await expect(page.getByText('AI hints are unavailable right now.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ask again' })).toBeVisible();
  // Instead of AI hints: likely topics, the concept gap and similar problems.
  await expect(page.getByRole('complementary', { name: 'Concept gap and similar problems' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add \S+ .+ to practice$/ }).first()).toBeVisible();
});
