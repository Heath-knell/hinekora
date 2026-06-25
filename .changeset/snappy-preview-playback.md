---
"hinekora": patch
---

**Improved:** Make capture preview, editor playback, and clip libraries more reliable.

Hinekora now does less work during startup and keeps preview data lighter, while fixing a few cases where overlays or edited clips could behave unexpectedly.

- **Live Preview:** Capture sources load faster, thumbnails are loaded only when needed, and cached preview images are kept bounded.
- **Editor:** Clips with corrected media durations no longer stop playback early or jump back to the start before the real clip end.
- **Clip libraries:** Replay updates are applied incrementally, and media library sorting has been tuned for smoother browsing.
- **Aura editing:** The crop selector closes when it loses focus, so grid lines do not linger after leaving the game flow.
