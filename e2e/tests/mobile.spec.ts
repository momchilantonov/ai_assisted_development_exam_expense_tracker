import { expect, test, type Page } from "@playwright/test";
import { createExpenseViaUi, login, todayUtc } from "../support/helpers";

const SHOTS = "../docs/evidence/screenshots";

async function noHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("expenses and dashboard fit a 360 px viewport without page scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page);
  const date = todayUtc();
  for (const [category, amount, description] of [
    ["Food", "18.40", "Mobile groceries with a fairly long description text"],
    ["Transport", "52.00", "Mobile train pass"],
    ["Bills", "1120.99", "Mobile electricity"],
  ]) {
    await createExpenseViaUi(page, { amount, category, date, description });
  }
  await expect(
    page.getByRole("row").filter({ hasText: "Mobile electricity" }),
  ).toBeVisible();
  await expect(page.getByText("Expense added.")).toBeHidden({
    timeout: 10_000,
  });
  await noHorizontalScroll(page);
  await page.screenshot({
    path: `${SHOTS}/expenses-mobile.png`,
    fullPage: true,
  });

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Total spent")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Spending by category/ }),
  ).toBeVisible();
  await noHorizontalScroll(page);
});
