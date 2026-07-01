---
"hinekora": patch
---

**Fixed:** Make editor loading, trimming, and project saves steadier.

The editor now avoids repeated media loads while opening edits, keeps the timeline ruler stable during trim adjustments, and saves timeline changes after the edit is committed instead of during every drag movement.

- **Editor loading:** Opening the editor or a saved edit waits for the route and local settings before refreshing My Media, reducing duplicate media loads.
- **Timeline trimming:** The time ruler no longer shrinks under the cursor while trimming the end of the last clip.
- **Project saves:** Timeline edits, undo/redo, and project renames are saved in a safer order so local edits are not overwritten by stale save responses.
