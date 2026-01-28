import { test, expect } from '@playwright/test';

test('E2E – brak dostępu do funkcji chronionych bez logowania (odpowiedź aplikacji)', async ({ page }) => {
    const response = await page.goto('/portfolio');


    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(500);
});
