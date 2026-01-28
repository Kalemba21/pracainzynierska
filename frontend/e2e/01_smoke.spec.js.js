import { test, expect } from '@playwright/test';

test('E2E – uruchomienie aplikacji (widok główny)', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/localhost:5173/);

    await expect(page.locator('body')).toBeVisible();
});
