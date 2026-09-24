import * as React from "react"

import {
  internalHandle,
  setConfirmConfigHandler,
} from "~/components/confirm-dialog-handle"
import {
  ConfirmDialog as BaseConfirmDialog,
  type ConfirmDialogConfig,
} from "~/components/ui/base-alert-dialog"

export function ConfirmDialog() {
  const [config, setConfig] = React.useState<ConfirmDialogConfig>({
    title: "confirm",
    onConfirm: () => {},
  })

  React.useEffect(() => {
    setConfirmConfigHandler(setConfig)
    return () => {
      setConfirmConfigHandler(null)
    }
  }, [])

  return <BaseConfirmDialog handle={internalHandle} {...config} />
}
