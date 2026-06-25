import { FiCopy, FiMinus, FiSquare, FiX } from "react-icons/fi";

import AppTitle from "~/renderer/modules/app-menu/AppMenu.component/AppTitle/AppTitle";
import { useAppMenuShallow } from "~/renderer/store";

const WINDOW_ICON_SIZE = 12;
const CLOSE_ICON_SIZE = 16;
const APPBAR_BUTTON_CLASS = "no-drag btn btn-ghost btn-sm";

function AppSetupAppBar() {
  const { close, isMaximized, maximize, minimize, unmaximize } =
    useAppMenuShallow((appMenu) => ({
      close: appMenu.close,
      isMaximized: appMenu.isMaximized,
      maximize: appMenu.maximize,
      minimize: appMenu.minimize,
      unmaximize: appMenu.unmaximize,
    }));

  const handleMinimize = () => {
    minimize();
  };

  const handleMaximize = () => {
    void maximize();
  };

  const handleUnmaximize = () => {
    void unmaximize();
  };

  const handleClose = () => {
    close();
  };

  return (
    <div className="drag relative z-10 flex items-center justify-between px-2 shadow-[0_0_10px_black] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-px before:bg-base-100 before:content-['']">
      <div className="flex items-center gap-2">
        <AppTitle />
      </div>
      <div className="flex gap-0">
        <button
          className={APPBAR_BUTTON_CLASS}
          title="Minimize"
          type="button"
          onClick={handleMinimize}
        >
          <FiMinus size={WINDOW_ICON_SIZE} />
        </button>
        {isMaximized ? (
          <button
            className={APPBAR_BUTTON_CLASS}
            title="Restore"
            type="button"
            onClick={handleUnmaximize}
          >
            <FiCopy size={WINDOW_ICON_SIZE} className="scale-x-[-1]" />
          </button>
        ) : (
          <button
            className={APPBAR_BUTTON_CLASS}
            title="Maximize"
            type="button"
            onClick={handleMaximize}
          >
            <FiSquare size={WINDOW_ICON_SIZE} />
          </button>
        )}
        <button
          className={APPBAR_BUTTON_CLASS}
          title="Close"
          type="button"
          onClick={handleClose}
        >
          <FiX size={CLOSE_ICON_SIZE} />
        </button>
      </div>
    </div>
  );
}

export default AppSetupAppBar;
