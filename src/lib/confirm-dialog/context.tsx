"use client";

import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import * as React from "react";

import {
  ConfirmDialog,
  type ConfirmDialogConfig,
} from "~/components/ui/base-alert-dialog";

const internalHandle = AlertDialog.createHandle();

let setConfigFn: ((config: ConfirmDialogConfig) => void) | null = null;

export const confirm = {
  open: (config: ConfirmDialogConfig) => {
    setConfigFn?.(config);
    internalHandle.open(null);
  },
  close: () => {
    internalHandle.close();
  },
};

export function ConfirmDialog_() {
  const [config, setConfig] = React.useState<ConfirmDialogConfig>({
    title: "Confirm",
    onConfirm: () => {},
  });

  React.useEffect(() => {
    setConfigFn = setConfig;
    return () => {
      setConfigFn = null;
    };
  }, []);

  return <ConfirmDialog handle={internalHandle} {...config} />;
}
