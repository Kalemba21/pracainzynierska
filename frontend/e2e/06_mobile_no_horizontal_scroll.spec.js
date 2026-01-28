import { test, expect } from '@playwright/test';

test('E2E – mobile: brak poziomego przewijania (layout nie wyjeżdża)', async ({ page }, testInfo) => {
    await page.goto('/');


    const hasHorizontalScroll = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
    });

    expect(hasHorizontalScroll, 'Wykryto poziomy scroll (layout wyjeżdża poza ekran)').toBeFalsy();
});
