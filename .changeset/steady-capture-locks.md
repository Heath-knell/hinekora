---
"hinekora": patch
---

**Fixed:** Keep capture controls locked during active recording or rewind.

The dashboard and app bar now update their locked state as soon as session recording or rewind starts, so the active capture session cannot be changed mid-recording.

- **Capture profiles:** Disables profile switching, profile edits, and live preview source changes while recording or rewind is active.
- **App bar:** Keeps the recording game selected and prevents switching to the other Path of Exile game until capture stops.
- **Saved recordings:** Keeps the game tied to the active recording session even if dashboard settings change later.
