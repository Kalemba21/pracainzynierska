import { test, expect } from '@playwright/test';

test('E2E – backend: brak odpowiedzi 5xx dla requestów API', async ({ page }) => {
    const apiErrors = [];

    page.on('response', async (res) => {
        const url = res.url();

        if (!url.includes(':4000')) return;

        const status = res.status();
        if (status >= 500) {
            apiErrors.push({ url, status });
        }
    });

    const res = await page.goto('/');
    expect(res).not.toBeNull();
    expect(res.status()).toBeLessThan(500);

    await page.waitForTimeout(1500);

    expect(
        apiErrors,
        `Wykryto błędy 5xx po stronie backendu: ${JSON.stringify(apiErrors, null, 2)}`
    ).toHaveLength(0);
});
