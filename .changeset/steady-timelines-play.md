---
"hinekora": patch
---

**Improved:** Smoother playback on recording and rewind detail timelines.

Recording and rewind detail pages now keep video playback, elapsed time, and the timeline marker aligned while doing less work during playback.

- **Playback timelines:** Elapsed time and the timeline marker now follow presented video frames smoothly without refreshing the full interface for every frame.
- **Seeking:** Timeline jumps and five-second skip controls stay responsive and recover cleanly when video frames are delayed.
- **Rewind sessions:** Moving between linked clips keeps the session timeline synchronized with the currently playing moment.
