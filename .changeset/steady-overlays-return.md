---
"hinekora": minor
---

**Added:** Per-overlay visibility controls for multi-monitor play.

Hinekora can now keep selected overlays visible whenever Path of Exile or Path of Exile 2 is running, even when the game window is not focused, while still respecting overlays you hide manually.

Capture stream recovery and the suggestion to keep aura overlays available across focus changes were contributed by [@Heath-knell](https://github.com/Heath-knell).

- **Overlay settings:** Choose independent focus behavior for recording controls, aura overlays, clip previews, and the grid lines overlay.
- **Overlay coordination:** Opening the grid lines overlay temporarily hides other overlays, and requested overlays return when editing finishes or game focus changes.
- **Aura reliability:** The requested aura profile follows the running game and restores correctly after closing or restarting the game.
- **Capture recovery:** Live Preview and aura capture recover from replaced or temporarily unavailable game windows without continuous background polling.
- **Capture performance:** Dashboard Live Preview stops while recording or rewind is active, leaving more capture capacity available for gameplay.
