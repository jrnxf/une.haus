"use client";

import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import * as React from "react";

import {
  ConfirmDialog,
  type ConfirmDialogConfig,
} from "~/components/ui/base-alert-dialog";

type DialogHandle = ReturnType<typeof AlertDialog.createHandle>;

interface DialogRegistration {
  handle: DialogHandle;
  config: ConfirmDialogConfig;
}

interface ConfirmDialogContextValue {
  registerDialog: (
    id: string,
    handle: DialogHandle,
    config: ConfirmDialogConfig,
  ) => void;
}

const ConfirmDialogContext =
  React.createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialogs, setDialogs] = React.useState<Map<string, DialogRegistration>>(
    new Map(),
  );

  const registerDialog = React.useCallback(
    (id: string, handle: DialogHandle, config: ConfirmDialogConfig) => {
      setDialogs((prev) => {
        const next = new Map(prev);
        next.set(id, { handle, config });
        return next;
      });
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      registerDialog,
    }),
    [registerDialog],
  );

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {[...dialogs.entries()].map(([id, { handle, config }]) => (
        <ConfirmDialog key={id} handle={handle} {...config} />
      ))}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(config: ConfirmDialogConfig) {
  const context = React.useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      "useConfirmDialog must be used within a ConfirmDialogProvider",
    );
  }

  const id = React.useId();
  const handle = AlertDialog.createHandle();

  // Register on mount
  React.useEffect(() => {
    context.registerDialog(id, handle, config);
  }, [config, context, handle, id]);

  return handle;
}
