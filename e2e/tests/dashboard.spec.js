import { expect, test } from '@playwright/test';
import { linkHandle, signUp, uniqueUser } from '../helpers/account.js';

test('signup → link handle (starts the first sync) → dashboard shows stats', async ({ page }) => {
  const user = uniqueUser('dash');
  await signUp(page, user);

  // No handle yet: the dashboard asks for one instead of showing empty charts.
  await expect(page.getByRole('form', { name: 'Link your Codeforces handle' })).toBeVisible();
  await linkHandle(page, user.handle);

  const numbers = page.getByLabel('Your numbers');
  await expect(numbers).toBeVisible();
  // The fake history has 14 solved problems and 5 tried but not solved (see fakeCodeforces.js).
  // CountUp: the final value for screen readers, and the visible figure once it lands.
  const solved = page.getByTestId('tile-solved').locator('dd');
  await expect(solved.locator('.sr-only')).toHaveText('14');
  await expect(solved.locator('[aria-hidden="true"]')).toHaveText('14');
  await expect(page.getByTestId('tile-rating').locator('dd .sr-only')).toHaveText('1450');
  await expect(page.getByText(/no submissions in the last 30 days/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Weak topics/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Topic strength/i })).toBeVisible();
  await expect(page.getByText(/Synced just now/)).toBeVisible();
});

test('an unknown Codeforces handle gets a specific message', async ({ page }) => {
  await signUp(page, uniqueUser('nohandle'));
  await linkHandle(page, 'nobody_here_42');
  await expect(page.getByText(/couldn.t find "nobody_here_42"/i)).toBeVisible();
});
