# Hinekora Privacy Policy

Last updated: July 15, 2026

This policy explains what Hinekora stores locally and when the desktop app
connects to external services.

## Summary

- Gameplay data and media stay on your device unless you choose to share or
  upload them.
- Hinekora does not use product analytics, page-view analytics, advertising
  trackers, or analytics cookies.
- Hinekora connects to Supabase for league data, Sentry for optional crash
  reporting, and GitHub's release infrastructure for updates and release notes.

## Data Stored on Your Device

Hinekora stores the data needed to provide its features, including settings,
capture profiles, recordings, clips, media paths and metadata, bookmarks, saved
edits, and cached league data. It may also read Path of Exile's `Client.txt` to
provide game-aware features.

Recordings, clips, `Client.txt` contents, bookmarks, saved edits, and local
media files are not uploaded by Hinekora. They leave your device only when you
choose to share, copy, export, or upload them outside the app.

You can remove local data through the app where deletion is available, by
deleting the relevant files, or by uninstalling Hinekora and clearing its app
data.

## External Services

When Hinekora contacts an external service, that service necessarily receives
the connection's IP address and may receive technical request metadata such as
the request time and user agent. Hinekora does not use an IP address to identify
an individual user.

### Supabase: League Catalog

Hinekora uses Supabase to keep Path of Exile league names and current-league
defaults up to date without requiring a new app release for every league
rotation.

The app creates or refreshes a pseudonymous Supabase session and sends the
requested game (`poe1` or `poe2`), the Hinekora version, and the session token
needed to access the league endpoint. The session is not linked to a Hinekora
account or Path of Exile account. It is stored locally so the app can reuse it;
where Electron secure storage is available, it is encrypted on disk.
If Supabase rejects an expired session and a new pseudonymous session is
created, Hinekora retains up to five previous user IDs locally, without their
invalid session tokens. Current and retained IDs are available as masked,
copyable values in **Settings -> Privacy & Telemetry** so they can be included
with a privacy request.

A league refresh can indicate that an app installation was active at that
time. Supabase is not used to record page views, clicks, navigation history,
feature usage, gameplay activity, or local files.

### Sentry: Crash Reporting

Crash reporting is enabled by default. Hinekora uses Sentry to receive crash
and error reports that can include the error type, stack trace, operating
system, app version, and diagnostic breadcrumbs.

Hinekora configures Sentry not to send default personally identifiable
information and redacts known username and path patterns where possible. It
does not intentionally send Path of Exile account names, `Client.txt` contents,
recordings, clips, saved edits, or full local file paths.

You can disable crash reporting in **Settings -> Privacy & Telemetry**. The
change takes effect after restarting Hinekora.

### GitHub: Updates and Release Information

The Changelog page reads the `CHANGELOG.md` file bundled with Hinekora and does
not require a network request.

When the app shows **What's New**, it may request up to five recent GitHub
releases and display their version, title, publication date, link, and Markdown
release notes. Hinekora may show this automatically after an app update or when
you open it from the Help menu.

On Linux, update checks request the latest release from the GitHub API. On
Windows and macOS, Electron's updater contacts `update.electronjs.org`, which
provides update data backed by GitHub Releases and may download an available
update. Direct GitHub API requests identify the client as Hinekora and include
the app version in the user agent.

No Supabase session, gameplay data, `Client.txt` contents, recordings, clips,
or local media files are sent for update or release-information requests.

## Legal Bases and Your Choices

Where a legal basis is required, Hinekora relies on:

| Processing | Legal basis |
| --- | --- |
| Local data needed to provide app features | Performance of the functionality you request and legitimate interest in preserving app state |
| League catalog refreshes | Legitimate interest in keeping league data and filters current |
| Crash reporting | Legitimate interest in diagnosing failures and improving app stability |
| Update and release requests | Legitimate interest in keeping the app secure, compatible, and current |

You can opt out of future crash reporting at any time by disabling it in
settings.

## Retention and Deletion

Local app data, cached leagues, the Supabase session, and up to five previous
pseudonymous user IDs remain on your device until they are replaced, reset, or
deleted with Hinekora's app data.

Provider-side authentication records, crash reports, and network logs may be
retained according to provider settings and policies. Hinekora keeps data in
provider accounts only as long as needed for the purposes described above.

## Your Privacy Rights

Depending on where you live, you may have rights to access, correct, delete,
restrict, port, or object to the processing of your personal data. You may also
withdraw consent and lodge a complaint with your local data protection
authority.

To make a privacy request, contact `@ailundefined` on Discord and include the
pseudonymous user IDs shown in **Settings -> Privacy & Telemetry** so the
relevant Supabase data can be located. An IP address alone is not treated as a
reliable identifier.

Hinekora will respond without undue delay and, where GDPR applies, within one
month unless an extension is permitted. If the supplied information is not
enough to identify related data, Hinekora will explain that.

## International Processing

External providers may process data outside your country. Where a provider
processes personal data on Hinekora's behalf, Hinekora uses applicable data
processing terms and, where required, safeguards for international transfers.

## Changes

This policy may change as Hinekora evolves. Updates are tracked in this
repository.
