---
"hinekora": patch
---

**Fixed:** Make editor exports and clipboard copies more reliable.

Editor exports and copied clips now use the installed app's bundled media tools correctly, and recordings use the actual MP4 length when building the editor timeline.

- **Editor:** Save and Copy to clipboard should no longer fail because the bundled media tool could not be launched from the installed app.
- **Recording library:** Recordings with fractional-second lengths now keep their precise duration instead of being rounded to the nearest second.
