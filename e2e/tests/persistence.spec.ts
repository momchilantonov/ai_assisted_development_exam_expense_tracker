import { expect, test } from "@playwright/test";
import {
  createExpenseViaUi,
  login,
  todayUtc,
  uniqueText,
} from "../support/helpers";
import { restartBackend } from "../support/servers";

test("expense survives a backend restart", async ({ page, browser }) => {
  const description = uniqueText("e2e persist");

  await login(page);
  await createExpenseViaUi(page, {
    amount: "77.25",
    category: "Bills",
    date: todayUtc(),
    description,
  });
  await expect(
    page.getByRole("row").filter({ hasText: description }),
  ).toBeVisible();

  await restartBackend();

  // Session rows are stored in the database, so the old cookie keeps working.
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: description }),
  ).toContainText("77.25");

  // A brand-new browser context must authenticate again and still see the data.
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto("/expenses");
  await expect(freshPage).toHaveURL(/\/login/);
  await login(freshPage);
  await freshPage.getByRole("link", { name: "Expenses" }).click();
  await expect(
    freshPage.getByRole("row").filter({ hasText: description }),
  ).toContainText("77.25");
  await fresh.close();
});
