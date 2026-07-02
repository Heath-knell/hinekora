---
"hinekora": patch
---

**Fixed:** Make profile switching and overlays more reliable after relaunch.

Capture profiles, aura profiles, and overlay windows now stay in sync more consistently when Hinekora starts while Path of Exile is already running, when switching games, or when changing profiles from the dashboard and recorder overlay.

- **Capture profiles:** Remembers profile selection more reliably across relaunches and game switches.
- **Aura overlays:** Keeps aura profile selection aligned with the active game so overlays continue to render after startup and profile changes.
- **Recorder overlay:** Keeps profile selection and locked settings behavior consistent between the expanded and compact overlay controls.
- **Dashboard settings:** Prevents stale profile, settings, or game-process updates from overwriting newer choices.
