import { AlertDialog } from "@base-ui/react/alert-dialog"

import type { ConfirmDialogConfig } from "~/components/ui/base-alert-dialog"

const internalHandle = AlertDialog.createHandle()

let setConfigFn: ((config: ConfirmDialogConfig) => void) | null = null

function setConfirmConfigHandler(
  fn: ((config: ConfirmDialogConfig) => void) | null,
) {
  setConfigFn = fn
}

const confirm = {
  open: (config: ConfirmDialogConfig) => {
    setConfigFn?.(config)
    internalHandle.open(null)
  },
  close: () => {
    internalHandle.close()
  },
}

export { confirm, internalHandle, setConfirmConfigHandler }
