import { test, expect } from '@playwright/test';

const routes = ['/', '/portfolio', '/admin', '/history', '/rates'];

test('E2E – kluczowe ścieżki odpowiadają (brak 5xx)', async ({ page }) => {
    for (const r of routes) {
        const res = await page.goto(r);
        expect(res, `Brak odpowiedzi dla trasy ${r}`).not.toBeNull();
        expect(res.status(), `Błąd 5xx dla trasy ${r}: ${res.status()}`).toBeLessThan(500);
    }
});
