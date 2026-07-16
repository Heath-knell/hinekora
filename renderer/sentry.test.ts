import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
}));

vi.mock("@sentry/electron/renderer", () => sentryMocks);

import { initSentry, resetSentryForTests } from "./sentry";

describe("renderer sentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.com/1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    resetSentryForTests();
  });

  it("initializes the renderer Sentry SDK once", () => {
    initSentry();
    initSentry();

    expect(sentryMocks.init).toHaveBeenCalledTimes(1);
    expect(sentryMocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeBreadcrumb: expect.any(Function),
        beforeSend: expect.any(Function),
        dsn: "https://public@example.com/1",
        sendDefaultPii: false,
      }),
    );
  });

  it("skips initialization when crash reporting is disabled", () => {
    initSentry(false);

    expect(sentryMocks.init).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      "[Sentry] Crash reporting disabled by user preference",
    );
  });

  it("scrubs username query values from console breadcrumbs", () => {
    initSentry();
    const [options] = sentryMocks.init.mock.calls[0] ?? [];
    if (!options) {
      throw new Error("Sentry init options were not captured");
    }
    const { beforeBreadcrumb } = options;
    const breadcrumb = {
      category: "console",
      message: "request username=SebAccount)",
    };

    expect(beforeBreadcrumb(breadcrumb)).toEqual({
      category: "console",
      message: "request username=[redacted])",
    });
  });

  it("scrubs every breadcrumb category and nested data", () => {
    initSentry();
    const [options] = sentryMocks.init.mock.calls[0] ?? [];
    if (!options) {
      throw new Error("Sentry init options were not captured");
    }
    const { beforeBreadcrumb } = options;
    const breadcrumb = {
      category: "navigation",
      data: {
        nested: {
          path: "C:\\Users\\Seb\\AppData\\Local\\Hinekora\\index.html",
        },
      },
      message: "request username=SebAccount)",
    };

    expect(beforeBreadcrumb(breadcrumb)).toEqual({
      category: "navigation",
      data: { nested: { path: "C:\\**\\Hinekora\\index.html" } },
      message: "request username=[redacted])",
    });
  });

  it("recursively scrubs renderer events before sending", () => {
    initSentry();
    const [options] = sentryMocks.init.mock.calls[0] ?? [];
    if (!options) {
      throw new Error("Sentry init options were not captured");
    }

    expect(
      options.beforeSend({
        contexts: {
          local: {
            path: "/Users/seb/Library/Hinekora/settings.json",
          },
        },
      }),
    ).toEqual({
      contexts: { local: { path: "/**/Hinekora/settings.json" } },
    });
  });
});
