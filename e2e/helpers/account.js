import { expect } from '@playwright/test';

let counter = 0;

/** A unique email and Codeforces handle per test (tests run in parallel on one backend). */
export const uniqueUser = (label) => {
  counter += 1;
  const tag = `${label.slice(0, 5)}${counter}${Math.random().toString(36).slice(2, 10)}`;
  // Handles are capped at 24 characters: e2e_ + at most 5 + counter + 8 stays well under.
  return { name: `E2E ${label}`, email: `${tag}@e2e.test`, password: 'Practice-only-2026', handle: `e2e_${tag}` };
};

/** Signs up through the form and waits for the dashboard. */
export const signUp = async (page, user) => {
  await page.goto('/signup');
  const form = page.getByRole('form', { name: 'Sign up' });
  await form.getByLabel('Name').fill(user.name);
  await form.getByLabel('Email').fill(user.email);
  await form.getByLabel('Password').fill(user.password);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

/** Links the fake handle; linking starts the first sync, which fills the scoreboard. */
export const linkHandle = async (page, handle) => {
  const form = page.getByRole('form', { name: 'Link your Codeforces handle' });
  await form.getByLabel('Codeforces handle').fill(handle);
  await form.getByRole('button', { name: 'Link handle' }).click();
};

/** A new account with a linked and synced handle, on the dashboard. */
export const syncedAccount = async (page, label) => {
  const user = uniqueUser(label);
  await signUp(page, user);
  await linkHandle(page, user.handle);
  await expect(page.getByRole('list', { name: 'Your numbers' }).or(page.getByLabel('Your numbers'))).toBeVisible();
  return user;
};
