import { useEffect } from "react";

const actionMenuSelector = [
  ".clients-action-menu",
  ".users-action-menu",
  ".clients-row-action",
  ".users-row-action",
].join(",");

export function useCloseOnOutsideClick(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Element && target.closest(actionMenuSelector)) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, onClose]);
}
