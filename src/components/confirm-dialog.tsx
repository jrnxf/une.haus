import { AlertDialog } from "@base-ui/react/alert-dialog"
import * as React from "react"

import {
  ConfirmDialog as BaseConfirmDialog,
  type ConfirmDialogConfig,
} from "~/components/ui/base-alert-dialog"

const internalHandle = AlertDialog.createHandle()

let setConfigFn: ((config: ConfirmDialogConfig) => void) | null = null

export const confirm = {
  open: (config: ConfirmDialogConfig) => {
    setConfigFn?.(config)
    internalHandle.open(null)
  },
  close: () => {
    internalHandle.close()
  },
}

export function ConfirmDialog() {
  const [config, setConfig] = React.useState<ConfirmDialogConfig>({
    title: "confirm",
    onConfirm: () => {},
  })

  React.useEffect(() => {
    setConfigFn = setConfig
    return () => {
      setConfigFn = null
    }
  }, [])

  return <BaseConfirmDialog handle={internalHandle} {...config} />
}
