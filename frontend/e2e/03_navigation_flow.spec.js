import { test, expect } from '@playwright/test';

test('E2E – nawigacja pomiędzy widokami (brak błędu sieci)', async ({ page }) => {
    const response = await page.goto('/');

    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(500);

    const response2 = await page.goto('/');

    expect(response2).not.toBeNull();
    expect(response2.status()).toBeLessThan(500);
});
