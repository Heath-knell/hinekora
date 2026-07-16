import * as Sentry from "@sentry/electron/renderer";

import { scrubSensitiveText, scrubSentryValue } from "~/types";

let initialized = false;

function initSentry(enabled = true): void {
  if (!enabled) {
    console.info("[Sentry] Crash reporting disabled by user preference");
    return;
  }

  if (initialized) {
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubSentryValue(event) as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = scrubSensitiveText(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = scrubSentryValue(
          breadcrumb.data,
        ) as typeof breadcrumb.data;
      }

      return breadcrumb;
    },
  });

  initialized = true;
}

function resetSentryForTests(): void {
  initialized = false;
}

export { initSentry, resetSentryForTests };
