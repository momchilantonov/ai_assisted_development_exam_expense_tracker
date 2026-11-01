import { expect, test } from "@playwright/test";
import { createExpenseViaUi, login, todayUtc } from "../support/helpers";

const SHOTS = "../docs/evidence/screenshots";

test("capture screenshots of the running application", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/login.png` });

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/signup.png` });

  await login(page);
  const date = todayUtc();
  const items = [
    ["Food", "18.40", "Groceries"],
    ["Transport", "52.00", "Train pass"],
    ["Bills", "120.99", "Electricity"],
    ["Entertainment", "30.00", "Cinema"],
  ];
  for (const [category, amount, description] of items) {
    await createExpenseViaUi(page, {
      amount,
      category,
      date,
      description: `Screenshot ${description}`,
    });
  }
  await expect(
    page.getByRole("row").filter({ hasText: "Screenshot Electricity" }),
  ).toBeVisible();
  await expect(page.getByText("Expense added.")).toBeHidden({
    timeout: 10_000,
  });
  await page.screenshot({ path: `${SHOTS}/expenses.png`, fullPage: true });

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Total spent")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Spending by category/ }),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: true });
});
