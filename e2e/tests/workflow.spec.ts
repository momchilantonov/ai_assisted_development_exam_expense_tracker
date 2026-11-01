import { expect, test } from "@playwright/test";
import {
  credentials,
  readDashboard,
  todayUtc,
  uniqueText,
  login,
} from "../support/helpers";

test("full expense workflow (16 steps)", async ({
  page,
  playwright,
  baseURL,
}) => {
  const description = uniqueText("e2e lunch");
  const edited = `${description} edited`;
  const date = todayUtc();
  let before!: Awaited<ReturnType<typeof readDashboard>>;
  let oldCookie = "";

  await test.step("1. open the application", async () => {
    await page.goto("/");
  });

  await test.step("2. login page appears", async () => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  await test.step("3-4. invalid login shows an error and stays on login", async () => {
    await page.getByLabel("Username").fill(credentials().username);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Invalid username or password." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("5-6. login succeeds and the dashboard opens", async () => {
    await login(page);
    await expect(page).toHaveURL(/\/$/);
    before = await readDashboard(page);
  });

  await test.step("7. create an expense", async () => {
    await page.getByRole("link", { name: "Expenses" }).click();
    await page.getByRole("link", { name: "New expense" }).click();
    await page.getByLabel("Amount").fill("25.00");
    await page.getByLabel("Category").selectOption("Healthcare");
    await page.getByLabel("Date").fill(date);
    await page.getByLabel("Description (optional)").fill(description);
    await page.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Expense added.")).toBeVisible();
  });

  await test.step("8. the expense appears in the list", async () => {
    const row = page.getByRole("row").filter({ hasText: description });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Healthcare");
    await expect(row).toContainText("25.00");
  });

  await test.step("9. edit the expense", async () => {
    await page
      .getByRole("link", { name: `Edit expense ${description} on ${date}` })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit expense" }),
    ).toBeVisible();
    await page.getByLabel("Amount").fill("40.50");
    await page.getByLabel("Description (optional)").fill(edited);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Expense updated.")).toBeVisible();
  });

  await test.step("10. verify the changes", async () => {
    const row = page.getByRole("row").filter({ hasText: edited });
    await expect(row).toContainText("40.50");
    await expect(
      page.getByRole("row").filter({ hasText: `${description} on` }),
    ).toHaveCount(0);
  });

  await test.step("11. filter expenses", async () => {
    await page.getByLabel("Category").selectOption("Healthcare");
    await page.getByLabel("From").fill(date);
    await page.getByLabel("To").fill(date);
    await expect(
      page.getByRole("row").filter({ hasText: edited }),
    ).toBeVisible();
    await page.getByLabel("Category").selectOption("Bills");
    await expect(page.getByRole("row").filter({ hasText: edited })).toHaveCount(
      0,
    );
    await page.getByLabel("Category").selectOption("Healthcare");
    await expect(
      page.getByRole("row").filter({ hasText: edited }),
    ).toBeVisible();
  });

  await test.step("12. dashboard totals include the expense", async () => {
    const after = await readDashboard(page);
    expect(after.count).toBe(before.count + 1);
    expect(after.total).toBe(before.total + 4050);
    expect(after.month).toBe(before.month + 4050);
    const h0 = before.byCategory.Healthcare ?? { count: 0, total: 0 };
    expect(after.byCategory.Healthcare).toEqual({
      count: h0.count + 1,
      total: h0.total + 4050,
    });
  });

  await test.step("13. delete the expense (with confirmation)", async () => {
    await page.getByRole("link", { name: "Expenses" }).click();
    await page
      .getByRole("button", { name: `Delete expense ${edited} on ${date}` })
      .click();
    const dialog = page.getByRole("dialog", { name: "Delete expense?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Expense deleted.")).toBeVisible();
  });

  await test.step("14. verify deletion in the list and the dashboard", async () => {
    await expect(page.getByRole("row").filter({ hasText: edited })).toHaveCount(
      0,
    );
    const after = await readDashboard(page);
    expect(after.count).toBe(before.count);
    expect(after.total).toBe(before.total);
  });

  await test.step("15. log out", async () => {
    oldCookie =
      (await page.context().cookies()).find((c) => c.name === "expense_session")
        ?.value ?? "";
    expect(oldCookie).not.toBe("");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("16. protected access is denied", async () => {
    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect((await page.request.get("/api/expenses")).status()).toBe(401);
    const stale = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `expense_session=${oldCookie}` },
    });
    expect((await stale.get("/api/expenses")).status()).toBe(401);
    await stale.dispose();
  });
});
