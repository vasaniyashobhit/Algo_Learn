import { expect, test } from '@playwright/test';

const transformOf = (locator) => locator.evaluate((el) => getComputedStyle(el).transform);
const scaleOf = (matrix) => (matrix === 'none' ? 1 : Number(matrix.match(/matrix\(([^,]+)/)[1]));

test.describe('motion on', () => {
  test('buttons snap to 96% while pressed and spring back', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByRole('button', { name: 'Log in' });
    await button.hover();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(async () => scaleOf(await transformOf(button))).toBeLessThan(0.97);
    await page.mouse.up();
    await expect.poll(async () => scaleOf(await transformOf(button))).toBeGreaterThan(0.99);
  });

  test('the landing hero planes move at different speeds while scrolling (parallax)', async ({ page }) => {
    await page.goto('/');
    const board = page.locator('[data-depth="0.12"]');
    const before = await transformOf(board);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => transformOf(board)).not.toBe(before);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing travels: no press scale, no parallax, content visible at once', async ({ page }) => {
    await page.goto('/');
    const strap = page.getByRole('heading', { level: 1 });
    await expect(strap).toBeVisible();
    const offs = page.locator('[data-motion="off"]');
    expect(await offs.count()).toBeGreaterThan(0);
    expect(await page.locator('[data-motion="on"]').count()).toBe(0);

    const board = page.locator('[data-depth="0.12"]');
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect(await transformOf(board)).toBe('none');
    await expect(page.getByRole('table').first()).toBeVisible();

    await page.goto('/login');
    const button = page.getByRole('button', { name: 'Log in' });
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Pressed feedback without movement: the button dims instead of scaling.
    await expect.poll(() => button.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.78');
    expect(scaleOf(await transformOf(button))).toBe(1);
    await page.mouse.up();
  });
});
