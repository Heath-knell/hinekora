import { join } from "node:path";

import { app, Menu, nativeImage, Tray } from "electron";

import { createSafePathLogFields, logWarn } from "~/main/utils/app-log";

const TRAY_LOG_SCOPE = "tray";
const TRAY_MENU_ICON_COLOR = "#f8e6c9";
const TRAY_MENU_ICON_SIZE = 16;

type TrayMenuIconName = "discord" | "github" | "help" | "quit" | "show";

const TRAY_MENU_ICON_PATHS: Record<TrayMenuIconName, string> = {
  discord:
    '<path d="M8 9.5h.01"/><path d="M16 9.5h.01"/><path d="M7.5 15c1.5 1 7.5 1 9 0"/><path d="M7 18c-1.7-.6-3-1.6-3-3.8V8.8C4 6.1 6.2 4 8.9 4h6.2C17.8 4 20 6.1 20 8.8v5.4c0 2.2-1.3 3.2-3 3.8l-.8-2.1"/><path d="M7.8 15.9 7 18"/><path d="M16.2 15.9 17 18"/>',
  github:
    '<path d="M9 19c-4 .9-4-2-5.5-2.5"/><path d="M15 22v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.3 5.5-6A4.6 4.6 0 0 0 18.7 7c.1-.4.6-1.9-.1-4 0 0-1.1-.3-3.5 1.3A12.3 12.3 0 0 0 8.9 4.3C6.5 2.7 5.4 3 5.4 3c-.7 2.1-.2 3.6-.1 4A4.6 4.6 0 0 0 4 10.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V22"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1.5-2.4 1.7-2.7 3"/><path d="M12 17h.01"/>',
  quit: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  show: '<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 9h8"/>',
};

interface TrayActions {
  openDiscord(): void;
  openGitHub(): void;
  openHelp(): void;
  showMainWindow(): void;
  quitApplication(): void;
}

class TrayService {
  private static instance: TrayService | null = null;

  private tray: Tray | null = null;
  private actions: TrayActions | null = null;

  static getInstance(): TrayService {
    if (!TrayService.instance) {
      TrayService.instance = new TrayService();
    }

    return TrayService.instance;
  }

  createTray(actions: TrayActions): Tray {
    this.actions = actions;

    if (!this.tray) {
      this.tray = this.createTrayIcon();
      this.tray.setToolTip("Hinekora");
      this.tray.setIgnoreDoubleClickEvents(true);
      this.tray.on("click", () => this.actions?.showMainWindow());
    }

    this.updateContextMenu(this.tray);

    return this.tray;
  }

  destroyTray(): void {
    this.tray?.destroy();
    this.tray = null;
    this.actions = null;
  }

  getTray(): Tray | null {
    return this.tray;
  }

  private createTrayIcon(): Tray {
    const iconPath = this.resolveTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      logWarn(TRAY_LOG_SCOPE, "Tray icon failed to load", {
        ...createSafePathLogFields(iconPath, "icon"),
      });
    }

    if (process.platform === "darwin") {
      icon.setTemplateImage(true);
    }

    return new Tray(icon);
  }

  private updateContextMenu(tray: Tray): void {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Show Hinekora",
          icon: this.createMenuIcon("show"),
          click: () => this.actions?.showMainWindow(),
        },
        { type: "separator" },
        {
          label: "Help",
          icon: this.createMenuIcon("help"),
          click: () => this.actions?.openHelp(),
        },
        { type: "separator" },
        {
          label: "GitHub",
          icon: this.createMenuIcon("github"),
          click: () => this.actions?.openGitHub(),
        },
        {
          label: "Discord",
          icon: this.createMenuIcon("discord"),
          click: () => this.actions?.openDiscord(),
        },
        { type: "separator" },
        {
          label: "Quit Hinekora",
          icon: this.createMenuIcon("quit"),
          click: () => this.actions?.quitApplication(),
        },
      ]),
    );
  }

  private createMenuIcon(name: TrayMenuIconName): Electron.NativeImage {
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${TRAY_MENU_ICON_SIZE}" height="${TRAY_MENU_ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="${TRAY_MENU_ICON_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
      TRAY_MENU_ICON_PATHS[name],
      "</svg>",
    ].join("");
    const icon = nativeImage
      .createFromDataURL(`data:image/svg+xml,${encodeURIComponent(svg)}`)
      .resize({ width: TRAY_MENU_ICON_SIZE, height: TRAY_MENU_ICON_SIZE });

    if (process.platform === "darwin") {
      icon.setTemplateImage(true);
    }

    return icon;
  }

  private resolveTrayIconPath(): string {
    const platformIconPath =
      process.platform === "darwin"
        ? ["macos", "16x16.png"]
        : process.platform === "linux"
          ? ["linux", "icons", "32x32.png"]
          : ["windows", "icon.ico"];

    if (app.isPackaged && process.resourcesPath) {
      return join(process.resourcesPath, "logo", ...platformIconPath);
    }

    return join(
      app.getAppPath(),
      "renderer",
      "assets",
      "logo",
      ...platformIconPath,
    );
  }
}

export type { TrayActions };
export { TrayService };
