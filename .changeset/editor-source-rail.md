---
"hinekora": patch
---

**Fixed:** Keep the editor timeline aligned after trimming longer clips.

The editor timeline now keeps the visible ruler, clip rail, zoom controls, and media drops in sync when a clip is trimmed shorter than its original source video.

- **Timeline trimming:** Trimming the end of a longer clip no longer makes the timeline rail collapse to the shortened edit length.
- **Media drops:** Dropping new media onto the timeline now lands at the expected point on the visible rail.
- **Zoom controls:** Timeline zoom boundaries use the same visible duration as the editor timeline.
