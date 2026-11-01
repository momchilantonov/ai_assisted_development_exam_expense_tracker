import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { TEST_USERNAME } from "../test/handlers";
import { renderApp } from "../test/renderApp";
import { server } from "../test/server";

// Fake, test-only values.
const NEW_USER = "newcomer";
const NEW_PASSWORD = "fresh-password";

async function fill(username: string, password: string, confirm: string) {
  const user = userEvent.setup();
  if (username) await user.type(screen.getByLabelText("Username"), username);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  if (confirm)
    await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Sign up" }));
}

describe("sign-up page", () => {
  it("signs up, logs in and shows the dashboard with the new username", async () => {
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(NEW_USER, NEW_PASSWORD, NEW_PASSWORD);
    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText(NEW_USER)).toBeInTheDocument();
  });

  it("honours the next target after sign-up", async () => {
    renderApp("/signup?next=%2Fexpenses%2Fnew");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(NEW_USER, NEW_PASSWORD, NEW_PASSWORD);
    expect(
      await screen.findByRole("heading", { name: "New expense" }),
    ).toBeInTheDocument();
  });

  it("shows field-level errors and sends no request for invalid input", async () => {
    let calls = 0;
    server.use(
      http.post("/api/auth/register", () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill("ab", "short", "short");
    expect(
      screen.getByText("Username must be 3 to 64 characters."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password must be 8 to 128 characters."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Password must be 8 to 128 characters.",
    );
    expect(calls).toBe(0);
  });

  it("shows an error when the passwords do not match", async () => {
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(NEW_USER, NEW_PASSWORD, "different-password");
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.queryByRole("heading", { name: "Dashboard" }),
    ).not.toBeInTheDocument();
  });

  it("shows a username-level message when the username is taken", async () => {
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(TEST_USERNAME, NEW_PASSWORD, NEW_PASSWORD);
    expect(
      await screen.findByText("Username is already taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAccessibleDescription(
      "Username is already taken.",
    );
    expect(screen.getByRole("button", { name: "Sign up" })).toBeEnabled();
  });

  it("shows a form error when the server returns 422", async () => {
    server.use(
      http.post("/api/auth/register", () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request.",
              details: [],
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(NEW_USER, NEW_PASSWORD, NEW_PASSWORD);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please check the entered values",
    );
  });

  it("disables the button while signing up", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("/api/auth/register", async () => {
        await gate;
        return HttpResponse.json(
          { username: NEW_USER, expires_at: "2030-01-01T00:00:00Z" },
          { status: 201 },
        );
      }),
    );
    renderApp("/signup");
    await screen.findByRole("heading", { name: "Sign up" });
    await fill(NEW_USER, NEW_PASSWORD, NEW_PASSWORD);
    expect(screen.getByRole("button", { name: "Signing up…" })).toBeDisabled();
    release();
    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("links between the sign-up and sign-in pages", async () => {
    const user = userEvent.setup();
    renderApp("/login");
    await user.click(await screen.findByRole("link", { name: "Sign up" }));
    expect(
      await screen.findByRole("heading", { name: "Sign up" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });
});
