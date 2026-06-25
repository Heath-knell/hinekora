---
"hinekora": patch
---

**Fixed:** Keep overlays from appearing over the desktop after waking Windows.

Hinekora now rechecks the latest game focus state when the system resumes or unlocks, so requested overlays only return when Path of Exile is actually focused.

- **Aura overlay:** Persistent aura overlays no longer pop back over other apps just because the game process is still running.
- **System resume:** Overlay restore stays lightweight and uses the existing game focus history instead of launching extra system probes.
