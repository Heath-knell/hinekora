---
"hinekora": patch
---

**Improved:** Smoother recording and playback during demanding gameplay.

Hinekora now prioritizes capture and playback over nonessential previews and storage calculations, reducing contention that could cause dropped frames or slideshow-like video.

- **NVIDIA recording:** Real-time capture now favors consistent frame delivery under heavy GPU load.
- **Recording playback:** Timeline thumbnails pause while a recording is playing so they do not compete with video playback.
- **Background work:** Aura editing previews use a lighter frame rate, while storage usage checks stay out of the capture path when a game or recording is active.
- **App bar:** Storage usage loads in the background and handles refresh failures without delaying startup or capture.
