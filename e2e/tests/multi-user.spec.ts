import { expect, test } from "@playwright/test";
import {
  createExpenseViaUi,
  randomPassword,
  readDashboard,
  submitSignup,
  todayUtc,
  uniqueText,
} from "../support/helpers";

test("two users sign up in separate browser contexts and see only their own data", async ({
  browser,
  baseURL,
}) => {
  const suffix = Date.now().toString(36);
  const alice = { name: `alice-${suffix}`, password: randomPassword() };
  const bob = { name: `bob-${suffix}`, password: randomPassword() };
  const aliceText = uniqueText("alice private");
  const bobText = uniqueText("bob private");
  const date = todayUtc();

  const ctxA = await browser.newContext({ baseURL });
  const ctxB = await browser.newContext({ baseURL });
  const ctxC = await browser.newContext({ baseURL });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const c = await ctxC.newPage();

  try {
    await test.step("alice signs up through the UI and lands on her dashboard", async () => {
      await submitSignup(a, alice.name, alice.password);
      await expect(a.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await expect(
        a.locator("header").getByText(alice.name, { exact: true }),
      ).toBeVisible();
      expect((await readDashboard(a)).count).toBe(0);
    });

    await test.step("alice creates an expense", async () => {
      await createExpenseViaUi(a, {
        amount: "42.00",
        category: "Food",
        date,
        description: aliceText,
      });
      await expect(
        a.getByRole("row").filter({ hasText: aliceText }),
      ).toBeVisible();
    });

    await test.step("bob signs up in a separate context and sees nothing of alice", async () => {
      await submitSignup(b, bob.name, bob.password);
      await expect(b.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await expect(
        b.locator("header").getByText(bob.name, { exact: true }),
      ).toBeVisible();
      await expect(
        b.locator("header").getByText(alice.name, { exact: true }),
      ).toHaveCount(0);
      expect((await readDashboard(b)).count).toBe(0);
      await b.goto("/expenses");
      await expect(b.getByRole("heading", { name: "Expenses" })).toBeVisible();
      await expect(b.getByText("No expenses yet.")).toBeVisible();
      await expect(b.getByText(aliceText)).toHaveCount(0);
    });

    await test.step("bob creates his own expense; dashboards stay separate", async () => {
      await createExpenseViaUi(b, {
        amount: "7.50",
        category: "Bills",
        date,
        description: bobText,
      });
      await expect(
        b.getByRole("row").filter({ hasText: bobText }),
      ).toBeVisible();
      await expect(b.getByText(aliceText)).toHaveCount(0);
      const bobDash = await readDashboard(b);
      expect(bobDash.count).toBe(1);
      expect(bobDash.total).toBe(750);

      await a.goto("/expenses");
      await expect(
        a.getByRole("row").filter({ hasText: aliceText }),
      ).toBeVisible();
      await expect(a.getByText(bobText)).toHaveCount(0);
      const aliceDash = await readDashboard(a);
      expect(aliceDash.count).toBe(1);
      expect(aliceDash.total).toBe(4200);
    });

    await test.step("API reads from bob's context never return alice's data", async () => {
      const list = await b.request.get("/api/expenses");
      expect(list.status()).toBe(200);
      const text = JSON.stringify(await list.json());
      expect(text).toContain(bobText);
      expect(text).not.toContain(aliceText);
    });

    await test.step("a duplicate username in another letter case shows an error", async () => {
      await submitSignup(c, alice.name.toUpperCase(), randomPassword());
      await expect(c).toHaveURL(/\/signup/);
      await expect(c.locator("#username-error")).toContainText(
        "Username is already taken.",
      );
      await expect(c.getByLabel("Username")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(c.locator("header")).toHaveCount(0);
      const me = await c.request.get("/api/auth/me");
      expect(me.status()).toBe(401);
    });

    await test.step("logging out bob keeps alice signed in", async () => {
      await b.getByRole("button", { name: "Log out" }).click();
      await expect(b).toHaveURL(/\/login/);
      await a.reload();
      await expect(
        a.getByRole("row").filter({ hasText: aliceText }),
      ).toBeVisible();
    });

    await test.step("bob logs in again with different letter case and keeps only his data", async () => {
      await b.getByLabel("Username").fill(bob.name.toUpperCase());
      await b.getByLabel("Password").fill(bob.password);
      await b.getByRole("button", { name: "Sign in" }).click();
      await expect(b.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await b.goto("/expenses");
      await expect(
        b.getByRole("row").filter({ hasText: bobText }),
      ).toBeVisible();
      await expect(b.getByText(aliceText)).toHaveCount(0);
    });
  } finally {
    await ctxA.close();
    await ctxB.close();
    await ctxC.close();
  }
});
