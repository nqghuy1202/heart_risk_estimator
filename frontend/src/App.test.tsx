import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { highRisk, schema } from "./test/fixtures";

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
  await user.selectOptions(screen.getByLabelText(/Sex/), "0");
  await user.type(screen.getByLabelText(/Resting blood pressure/), "130");
}

beforeEach(() => {
  document.cookie = "csrftoken=test-token";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the form", () => {
  it("renders the sections and fields the server declared", async () => {
    stubServer({});
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Patient" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vitals and bloodwork" })).toBeInTheDocument();

    expect(screen.getByText("Systolic pressure on admission, in mm Hg.")).toBeInTheDocument();
  });

  it("mirrors the server's range onto the number input", async () => {
    stubServer({});
    render(<App />);

    const input = await screen.findByLabelText(/Resting blood pressure/);
    expect(input).toHaveAttribute("min", "80");
    expect(input).toHaveAttribute("max", "220");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("wires the help line to its control for assistive technology", async () => {
    stubServer({});
    render(<App />);

    const input = await screen.findByLabelText(/Resting blood pressure/);
    expect(input).toHaveAttribute("aria-describedby", "help_trestbps");
  });

  it("pre-fills nothing but the selects", async () => {
    stubServer({});
    render(<App />);

    expect(await screen.findByLabelText(/Age \(years\)/)).toHaveValue(null);
    expect(screen.getByLabelText(/Sex/)).toHaveValue("1");
  });

  it("holds the verdict's place with a waiting block that is not itself a result", async () => {
    stubServer({});
    render(<App />);

    expect(await screen.findByText("No prediction yet")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector(".awaiting .steps")).toBeNull();
  });

  it("says so when the form definition cannot be loaded", async () => {
    stubServer({ schema: () => json({ detail: "boom" }, 500) });
    render(<App />);

    expect(await screen.findByText(/form definition could not be loaded/i)).toBeInTheDocument();
  });
});

describe("a successful prediction", () => {
  it("posts the typed values as JSON with the CSRF header", async () => {
    const user = userEvent.setup();
    const fetchMock = stubServer({ predict: () => json({ result: highRisk }) });
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    const input = screen.getByLabelText(/Resting blood pressure/);
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByLabelText(/Age \(years\)/)).toHaveValue(58);
  });

  it("shows no verdict panel alongside the errors", async () => {
    const user = userEvent.setup();
    stubServer({ predict: rejection });
    render(<App />);

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
    render(<App />);

    await fillForm(await waitForForm());
    await user.click(screen.getByRole("button", { name: "Predict" }));

    expect(await screen.findByText(/server is still running/i)).toBeInTheDocument();
  });
});

async function waitForForm() {
  await screen.findByRole("button", { name: "Predict" });
  return userEvent.setup();
}
