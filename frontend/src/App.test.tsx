import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { highRisk, schema } from "./test/fixtures";

function renderApp() {
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  );
}

function stubServer(handlers: {
  schema?: () => Response | Promise<Response>;
  predict?: () => Response | Promise<Response>;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/schema/")) {
      return handlers.schema ? handlers.schema() : json({ ...schema });
    }
    if (url.includes("/api/predict/")) {
      if (!handlers.predict) {
        throw new Error("The test made an unexpected prediction request.");
      }
      return handlers.predict();
    }
    throw new Error(`Unexpected request to ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Age \(years\)/), "58");
  await user.click(within(screen.getByLabelText(/Sex/)).getByRole("radio", { name: "Female" }));
  await user.type(screen.getByLabelText(/Resting blood pressure/), "130");
}

beforeEach(() => {
  document.cookie = "csrftoken=test-token";
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the form", () => {
  it("renders the sections and fields the server declared", async () => {
    stubServer({});
    renderApp();

    expect(await screen.findByRole("heading", { name: "Patient" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vitals and bloodwork" })).toBeInTheDocument();

    expect(screen.getByText("Systolic pressure on admission, in mm Hg.")).toBeInTheDocument();
  });

  it("mirrors the server's range onto the number input", async () => {
    stubServer({});
    renderApp();

    const input = await screen.findByLabelText(/Resting blood pressure/);
    expect(input).toHaveAttribute("min", "80");
    expect(input).toHaveAttribute("max", "220");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("wires the help line to its control for assistive technology", async () => {
    stubServer({});
    renderApp();

    const input = await screen.findByLabelText(/Resting blood pressure/);
    expect(input).toHaveAttribute("aria-describedby", "help_trestbps");
  });

  it("pre-fills nothing but the segmented choices", async () => {
    stubServer({});
    renderApp();

    expect(await screen.findByLabelText(/Age \(years\)/)).toHaveValue(null);
    const sexGroup = screen.getByLabelText(/Sex/);
    expect(within(sexGroup).getByRole("radio", { name: "Male" })).toBeChecked();
    expect(within(sexGroup).getByRole("radio", { name: "Female" })).not.toBeChecked();
  });

  it("holds the verdict's place with a waiting block that is not itself a result", async () => {
    stubServer({});
    renderApp();

    expect(await screen.findByText("No prediction yet")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector(".awaiting .steps")).toBeNull();
  });

  it("counts filled fields in the progress indicator as the user types", async () => {
    const user = userEvent.setup();
    stubServer({});
    renderApp();

    // Choices default to their first option, so only the two number fields start empty.
    expect(await screen.findByText("1 of 3 fields completed")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Age \(years\)/), "58");
    expect(screen.getByText("2 of 3 fields completed")).toBeInTheDocument();
  });

  it("flags an empty required field as soon as it is left, without a submit", async () => {
    const user = userEvent.setup();
    stubServer({});
    renderApp();

    const input = await screen.findByLabelText(/Age \(years\)/);
    await user.click(input);
    await user.tab();

    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clears a flagged field's error as soon as it is edited", async () => {
    const user = userEvent.setup();
    stubServer({});
    renderApp();

    const input = await screen.findByLabelText(/Age \(years\)/);
    await user.click(input);
    await user.tab();
    await screen.findByText("This field is required.");

    await user.type(input, "58");
    expect(screen.queryByText("This field is required.")).not.toBeInTheDocument();
  });

  it("moves the segmented selection with arrow keys", async () => {
    const user = userEvent.setup();
    stubServer({});
    renderApp();

    const sexGroup = await screen.findByLabelText(/Sex/);
    within(sexGroup).getByRole("radio", { name: "Male" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(within(sexGroup).getByRole("radio", { name: "Female" })).toBeChecked();
    expect(within(sexGroup).getByRole("radio", { name: "Female" })).toHaveFocus();
  });

  it("says so when the form definition cannot be loaded", async () => {
    stubServer({ schema: () => json({ detail: "boom" }, 500) });
    renderApp();

    expect(await screen.findByText(/form definition could not be loaded/i)).toBeInTheDocument();
  });
});

describe("a successful prediction", () => {
  it("posts the typed values as JSON with the CSRF header", async () => {
    const user = userEvent.setup();
    const fetchMock = stubServer({ predict: () => json({ result: highRisk }) });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    await screen.findByRole("status");
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/predict/"));
    expect(call).toBeDefined();
    const init = call?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ age: "58", sex: "0", trestbps: "130" });
    expect((init.headers as Record<string, string>)["X-CSRFToken"]).toBe("test-token");
  });

  it("states the outcome in words as well as in the inversion", async () => {
    const user = userEvent.setup();
    stubServer({ predict: () => json({ result: highRisk }) });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    const panel = await screen.findByRole("status");
    expect(within(panel).getByText("Elevated risk")).toBeInTheDocument();
    expect(within(panel).getByText("Elevated risk of heart disease")).toBeInTheDocument();
    expect(panel).toHaveClass("high");
    expect(screen.queryByText("No prediction yet")).not.toBeInTheDocument();
  });

  it("shows the vote margin as a named band with two of five steps filled", async () => {
    const user = userEvent.setup();
    stubServer({ predict: () => json({ result: highRisk }) });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    const panel = await screen.findByRole("status");
    expect(within(panel).getByText(/weak lean/)).toBeInTheDocument();
    expect(within(panel).getByText("57.7%")).toBeInTheDocument();

    const steps = panel.querySelectorAll(".steps span");
    expect(steps).toHaveLength(5);
    expect(panel.querySelectorAll(".steps span.on")).toHaveLength(2);
  });

  it("keeps the form populated so one field can be changed and resubmitted", async () => {
    const user = userEvent.setup();
    stubServer({ predict: () => json({ result: highRisk }) });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));
    await screen.findByRole("status");

    expect(screen.getByLabelText(/Age \(years\)/)).toHaveValue(58);
    expect(screen.getByLabelText(/Resting blood pressure/)).toHaveValue(130);
  });

  it("disables the button while the prediction is in flight", async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    stubServer({
      predict: () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(json({ result: highRisk }));
        }),
    });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    const button = await screen.findByRole("button", { name: "Predicting..." });
    expect(button).toBeDisabled();

    release?.();
    await screen.findByRole("button", { name: "Predict" });
  });
});

describe("a rejected prediction", () => {
  const rejection = () =>
    json({ errors: { trestbps: ["Enter a value between 80 and 220."] } }, 400);

  it("marks the offending field and states the constraint", async () => {
    const user = userEvent.setup();
    stubServer({ predict: rejection });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    expect(await screen.findByText("Enter a value between 80 and 220.")).toBeInTheDocument();
    expect(screen.getByText(/Some values need correcting/)).toBeInTheDocument();

    const input = screen.getByLabelText(/Resting blood pressure/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "help_trestbps error_trestbps");
  });

  it("moves focus to the first rejected field and keeps the other answers", async () => {
    const user = userEvent.setup();
    stubServer({ predict: rejection });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    const input = screen.getByLabelText(/Resting blood pressure/);
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByLabelText(/Age \(years\)/)).toHaveValue(58);
  });

  it("shows no verdict panel alongside the errors", async () => {
    const user = userEvent.setup();
    stubServer({ predict: rejection });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    await screen.findByText("Enter a value between 80 and 220.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports a server that cannot be reached without blaming a field", async () => {
    const user = userEvent.setup();
    stubServer({
      predict: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderApp();

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    expect(await screen.findByText(/server is still running/i)).toBeInTheDocument();
  });
});

async function waitForForm() {
  await screen.findByRole("button", { name: "Predict" });
  return userEvent.setup();
}

describe("switching language", () => {
  it("re-fetches the schema in the chosen language and remembers the choice", async () => {
    const user = userEvent.setup();
    const fetchMock = stubServer({});
    renderApp();

    await waitForForm();
    await user.click(screen.getByRole("button", { name: "VI" }));

    // The Vietnamese heading appears once the re-fetched schema resolves.
    expect(await screen.findByRole("heading", { name: "Đánh giá nguy cơ" })).toBeInTheDocument();

    const schemaCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/schema/"));
    expect(schemaCalls.at(-1)?.[0]).toContain("lang=vi");
    expect(localStorage.getItem("heart-risk-estimator:lang")).toBe("vi");
  });

  it("keeps values typed before the switch", async () => {
    const user = userEvent.setup();
    stubServer({});
    renderApp();

    await user.type(await screen.findByLabelText(/Age \(years\)/), "58");
    await user.click(screen.getByRole("button", { name: "VI" }));

    await screen.findByRole("heading", { name: "Đánh giá nguy cơ" });
    expect(screen.getByLabelText(/Age \(years\)/)).toHaveValue(58);
  });
});
