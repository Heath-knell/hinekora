import type { BrowserWindow } from "electron";

import { logWarn } from "~/main/utils/app-log";
import { safeErrorMessage } from "~/main/utils/ipc-validation";

import {
  hideGameOverlayWindow,
  showGameOverlayWindow,
  suspendGameOverlayWindow,
} from "./OverlayWindow.shared";

const SHOULD_GATE_GAME_OVERLAYS_TO_POE_FOCUS = true;
const SHOULD_GATE_GAME_OVERLAYS_TO_GAME_RUNNING = true;
const GAME_OVERLAY_COORDINATOR_SCOPE = "game-overlay-coordinator";

interface GameOverlayParticipant {
  restoreRequestedOverlay(): Promise<void> | void;
  suspendRequestedOverlay(): void;
}

interface GameOverlayParticipantOptions {
  ignorePoeFocus?: () => boolean;
}

interface RegisteredGameOverlayParticipant {
  participant: GameOverlayParticipant;
  shouldIgnorePoeFocus: () => boolean;
}

class GameOverlayCoordinator {
  private readonly participants: RegisteredGameOverlayParticipant[] = [];
  private readonly focusedOverlayIds = new Set<string>();
  private exclusiveParticipant: GameOverlayParticipant | null = null;
  private poeFocusActive = false;
  private gameRunningActive = false;
  private focusGateVersion = 0;
  private appliedFocusGateVersion = 0;
  private focusGateDrain: Promise<void> | null = null;

  register(
    participant: GameOverlayParticipant,
    options: GameOverlayParticipantOptions = {},
  ): void {
    if (this.participants.some((entry) => entry.participant === participant)) {
      return;
    }

    this.participants.push({
      participant,
      shouldIgnorePoeFocus: options.ignorePoeFocus ?? (() => false),
    });
  }

  setPoeFocusActive(active: boolean): void {
    if (this.poeFocusActive === active) {
      return;
    }

    this.poeFocusActive = active;
    void this.applyFocusGateToGameOverlays();
  }

  setOverlayFocusActive(overlayId: string, active: boolean): void {
    const hadFocus = this.focusedOverlayIds.has(overlayId);
    if (active === hadFocus) {
      return;
    }

    if (active) {
      this.focusedOverlayIds.add(overlayId);
    } else {
      this.focusedOverlayIds.delete(overlayId);
    }

    void this.applyFocusGateToGameOverlays();
  }

  setGameRunningActive(active: boolean): void {
    if (this.gameRunningActive === active) {
      return;
    }

    this.gameRunningActive = active;
    void this.applyFocusGateToGameOverlays();
  }

  setExclusiveParticipant(participant: GameOverlayParticipant | null): void {
    if (this.exclusiveParticipant === participant) {
      return;
    }

    this.exclusiveParticipant = participant;
    void this.applyFocusGateToGameOverlays();
  }

  resetExclusiveParticipant(): void {
    this.exclusiveParticipant = null;
  }

  canShowGameOverlays(participant?: GameOverlayParticipant): boolean {
    const shouldIgnorePoeFocus = participant
      ? (this.participants
          .find((entry) => entry.participant === participant)
          ?.shouldIgnorePoeFocus() ?? false)
      : false;
    const focusAllowed =
      !SHOULD_GATE_GAME_OVERLAYS_TO_POE_FOCUS ||
      shouldIgnorePoeFocus ||
      this.poeFocusActive ||
      this.focusedOverlayIds.size > 0;
    const runningAllowed =
      !SHOULD_GATE_GAME_OVERLAYS_TO_GAME_RUNNING || this.gameRunningActive;
    const exclusiveParticipantAllowed =
      this.exclusiveParticipant === null ||
      participant === this.exclusiveParticipant;

    return focusAllowed && runningAllowed && exclusiveParticipantAllowed;
  }

  showOrHideGameOverlayWindow(
    window: BrowserWindow | null,
    participant: GameOverlayParticipant,
  ): void {
    if (this.canShowGameOverlays(participant)) {
      this.showGameOverlayWindow(window);
      return;
    }

    this.suspendGameOverlayWindow(window);
  }

  showGameOverlayWindow(window: BrowserWindow | null): void {
    showGameOverlayWindow(window);
  }

  hideGameOverlayWindow(window: BrowserWindow | null): void {
    hideGameOverlayWindow(window);
  }

  suspendGameOverlayWindow(window: BrowserWindow | null): void {
    suspendGameOverlayWindow(window);
  }

  async applyFocusGateToGameOverlays(): Promise<void> {
    this.focusGateVersion += 1;
    let hasParticipantToRestore = false;

    for (const { participant } of [...this.participants]) {
      if (!this.canShowGameOverlays(participant)) {
        participant.suspendRequestedOverlay();
      } else {
        hasParticipantToRestore = true;
      }
    }

    if (!hasParticipantToRestore && !this.focusGateDrain) {
      this.appliedFocusGateVersion = this.focusGateVersion;
      return;
    }

    while (this.appliedFocusGateVersion !== this.focusGateVersion) {
      await this.ensureFocusGateDrain();
    }
  }

  private ensureFocusGateDrain(): Promise<void> {
    if (this.focusGateDrain) {
      return this.focusGateDrain;
    }

    const drain = this.drainFocusGateChanges()
      .catch((error: unknown) => {
        this.appliedFocusGateVersion = this.focusGateVersion;
        logWarn(
          GAME_OVERLAY_COORDINATOR_SCOPE,
          "Unexpected focus-gate failure",
          { error: safeErrorMessage(error) },
        );
      })
      .finally(() => {
        this.focusGateDrain = null;
      });
    this.focusGateDrain = drain;
    return drain;
  }

  private async drainFocusGateChanges(): Promise<void> {
    while (this.appliedFocusGateVersion !== this.focusGateVersion) {
      const version = this.focusGateVersion;

      for (const { participant } of [...this.participants]) {
        if (version !== this.focusGateVersion) {
          break;
        }

        if (!this.canShowGameOverlays(participant)) {
          continue;
        }

        try {
          await participant.restoreRequestedOverlay();
        } catch (error: unknown) {
          logWarn(
            GAME_OVERLAY_COORDINATOR_SCOPE,
            "Could not restore a requested game overlay",
            { error: safeErrorMessage(error) },
          );
        }

        if (!this.canShowGameOverlays(participant)) {
          participant.suspendRequestedOverlay();
        }
      }

      if (version === this.focusGateVersion) {
        this.appliedFocusGateVersion = version;
      }
    }
  }
}

export type { GameOverlayParticipant };
export { GameOverlayCoordinator };
