import { FiExternalLink, FiRefreshCcw, FiShield } from "react-icons/fi";

import { HINEKORA_PRIVACY_POLICY_URL } from "~/types";

function AppSetupPrivacyStep() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-base-content">
        Privacy & Telemetry
      </h2>
      <p className="mb-4 text-sm text-base-content/60">
        Hinekora makes limited network requests for crash diagnostics and league
        information. Here's what we use and why:
      </p>

      <div className="space-y-3">
        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-primary">
              <FiShield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base-content">
                Crash Reporting
                <span className="badge badge-ghost badge-sm ml-2 font-normal">
                  Sentry
                </span>
              </h3>
              <p className="mt-1 text-xs text-base-content/60">
                When something goes wrong, an error report can be sent so we can
                find and fix bugs quickly. This includes the error type, your
                OS, and app version.
              </p>
              <p className="mt-1.5 text-xs italic text-base-content/50">
                Usernames and local file paths are redacted where possible.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-primary">
              <FiRefreshCcw className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base-content">
                League Catalog
                <span className="badge badge-ghost badge-sm ml-2 font-normal">
                  Supabase
                </span>
              </h3>
              <p className="mt-1 text-xs text-base-content/60">
                Hinekora refreshes current Path of Exile league names using a
                persistent pseudonymous session. Requests include the game and
                app version, but never recordings, clips, Client.txt contents,
                or other local media.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-base-content/50">
        Crash reporting is enabled by default. You can turn it off in{" "}
        <span className="font-semibold text-base-content/70">
          Settings - Privacy & Telemetry
        </span>
        ; the change takes effect after restarting Hinekora.
      </p>
      <p className="mt-2 text-xs text-base-content/50">
        Review the{" "}
        <a
          className="link link-primary inline-flex items-center gap-0.5"
          href={HINEKORA_PRIVACY_POLICY_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Privacy Policy
          <FiExternalLink className="h-3 w-3" />
        </a>{" "}
        to understand how Hinekora handles app data.
      </p>
    </div>
  );
}

export default AppSetupPrivacyStep;
