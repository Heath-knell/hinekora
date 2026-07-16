import { app } from "electron";

import {
  formatSentryErrorMessage,
  initSentry,
} from "~/main/modules/sentry/Sentry.reporter";
import { logWarn } from "~/main/utils/app-log";

import { scrubSensitiveText, scrubSentryValue } from "~/types";
import pkgJson from "../../../package.json" with { type: "json" };

const SENTRY_LOG_SCOPE = "sentry";

function scrubPaths(text: string): string {
  return scrubSensitiveText(text);
}

function scrubBreadcrumbData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return scrubSentryValue(data) as Record<string, unknown>;
}

class SentryService {
  private static instance: SentryService | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(): SentryService {
    SentryService.instance ??= new SentryService();
    return SentryService.instance;
  }

  static resetForTests(): void {
    SentryService.instance = null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = initSentry({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      release: `hinekora@${pkgJson.version}`,
      environment: app.isPackaged ? "production" : "development",
      sendDefaultPii: false,

      beforeSend(event) {
        return scrubSentryValue(event) as typeof event;
      },

      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.message) {
          breadcrumb.message = scrubPaths(breadcrumb.message);
        }

        if (breadcrumb.data) {
          breadcrumb.data = scrubBreadcrumbData(
            breadcrumb.data as Record<string, unknown>,
          );
        }

        return breadcrumb;
      },
    })
      .then(() => {
        this.initialized = true;
      })
      .catch((error) => {
        logWarn(SENTRY_LOG_SCOPE, "Failed to initialize crash reporting", {
          error: formatSentryErrorMessage(error),
        });
      })
      .finally(() => {
        this.initializationPromise = null;
      });

    await this.initializationPromise;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export { SentryService, scrubBreadcrumbData, scrubPaths };
