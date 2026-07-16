import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  error: null as string | null,
  isFetching: false,
  isLoading: false,
  load: vi.fn(),
  previousUserIds: [] as string[],
  userId: "session-user-id" as string | null,
  writeText: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  usePoeLeaguesShallow: (selector: (poeLeagues: unknown) => unknown) =>
    selector({
      isFetchingByGame: { poe1: mocks.isFetching, poe2: false },
      isSessionUserIdLoading: mocks.isLoading,
      loadSessionUserId: mocks.load,
      previousSessionUserIds: mocks.previousUserIds,
      sessionUserId: mocks.userId,
      sessionUserIdError: mocks.error,
    }),
}));

import { PseudonymousUserIdField } from "./PseudonymousUserIdField";

let container: HTMLDivElement;
let root: Root;

async function renderField(): Promise<void> {
  await act(async () => {
    root.render(<PseudonymousUserIdField />);
  });
}

describe("PseudonymousUserIdField", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.error = null;
    mocks.isFetching = false;
    mocks.isLoading = false;
    mocks.previousUserIds = [];
    mocks.userId = "session-user-id";
    mocks.writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("loads and copies the masked identity", async () => {
    await renderField();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Copy pseudonymous user ID"]',
        )
        ?.click();
    });

    expect(mocks.load).toHaveBeenCalledOnce();
    expect(mocks.writeText).toHaveBeenCalledWith("session-user-id");
    await vi.waitFor(() => {
      expect(container.textContent).toContain("User ID copied.");
    });
  });

  it("copies and reveals current and previous identities for privacy requests", async () => {
    mocks.previousUserIds = ["previous-user-id"];
    await renderField();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Copy pseudonymous user ID"]',
        )
        ?.click();
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Reveal pseudonymous user ID"]',
        )
        ?.click();
    });

    expect(mocks.writeText).toHaveBeenCalledWith(
      "session-user-id\nprevious-user-id",
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Previous pseudonymous user ID 1"]',
      )?.value,
    ).toBe("previous-user-id");
    await vi.waitFor(() => {
      expect(container.textContent).toContain("User IDs copied.");
    });
  });

  it("reveals the identity for manual copying", async () => {
    await renderField();
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Pseudonymous user ID"]',
    );

    expect(input?.type).toBe("password");
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Reveal pseudonymous user ID"]',
        )
        ?.click();
    });

    expect(input?.type).toBe("text");
    expect(input?.value).toBe("session-user-id");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Hide pseudonymous user ID"]',
      ),
    ).not.toBeNull();
  });

  it("disables copying while no identity is available", async () => {
    mocks.userId = null;
    await renderField();

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Copy pseudonymous user ID"]',
    );
    expect(button?.disabled).toBe(true);
    button?.click();
    expect(mocks.writeText).not.toHaveBeenCalled();
  });

  it("shows loading and error states", async () => {
    mocks.error = "Identity unavailable";
    mocks.isLoading = true;
    await renderField();

    expect(container.textContent).toContain("Identity unavailable");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Pseudonymous user ID"]',
      )?.placeholder,
    ).toBe("Loading…");
  });

  it("shows a recoverable error when clipboard access fails", async () => {
    mocks.writeText.mockRejectedValueOnce(new Error("clipboard denied"));
    await renderField();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Copy pseudonymous user ID"]',
        )
        ?.click();
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain(
        "Reveal it to copy the value manually.",
      );
    });
  });

  it("waits for the initial league fetch before reading the identity", async () => {
    mocks.isFetching = true;
    await renderField();

    expect(mocks.load).not.toHaveBeenCalled();

    mocks.isFetching = false;
    await renderField();

    expect(mocks.load).toHaveBeenCalledOnce();
  });
});
