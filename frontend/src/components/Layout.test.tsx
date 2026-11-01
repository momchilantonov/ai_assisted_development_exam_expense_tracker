import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { errorBody, setMockLoggedIn } from "../test/handlers";
import { renderApp } from "../test/renderApp";
import { server } from "../test/server";

describe("layout", () => {
  it("shows navigation and the signed-in user, and navigates between pages", async () => {
    setMockLoggedIn();
    renderApp("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Dashboard");
    expect(screen.getByText("owner")).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Expenses" }));
    expect(
      await screen.findByRole("heading", { name: "Expenses" }),
    ).toBeInTheDocument();
  });

  it("logs out and returns to the login page", async () => {
    setMockLoggedIn();
    renderApp("/");
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Log out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("still leaves the session when the logout request fails", async () => {
    setMockLoggedIn();
    server.use(http.post("/api/auth/logout", () => HttpResponse.error()));
    renderApp("/");
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Log out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("redirects to login when an API call returns 401 (expired session)", async () => {
    setMockLoggedIn();
    server.use(
      http.get("/api/expenses", () =>
        HttpResponse.json(
          errorBody("not_authenticated", "Authentication required."),
          { status: 401 },
        ),
      ),
    );
    renderApp("/expenses");
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("navigation", { name: "Main" }),
      ).not.toBeInTheDocument(),
    );
  });
});
