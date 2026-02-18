import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { CrumbConfig } from "~/lib/page-header/types";

type MaxWidth = "lg" | "2xl" | "4xl" | "full";

type PageHeaderState = {
  actions: ReactNode | null;
  widget: ReactNode | null;
  mobileRow: ReactNode | null;
  breadcrumbs: CrumbConfig[] | null;
  maxWidth: MaxWidth | null;
};

const EMPTY_STATE: PageHeaderState = {
  actions: null,
  widget: null,
  mobileRow: null,
  breadcrumbs: null,
  maxWidth: null,
};

function createPageHeaderStore() {
  let state = EMPTY_STATE;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (next: PageHeaderState) => {
      state = next;
      for (const l of listeners) l();
    },
    reset: () => {
      state = EMPTY_STATE;
      for (const l of listeners) l();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

type PageHeaderStore = ReturnType<typeof createPageHeaderStore>;

const PageHeaderContext = createContext<PageHeaderStore | null>(null);

function useStore() {
  const store = useContext(PageHeaderContext);
  if (!store)
    throw new Error(
      "usePageHeaderStore must be used within PageHeaderProvider",
    );
  return store;
}

export function usePageHeaderStore() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function usePageHeaderStoreApi() {
  return useStore();
}

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPageHeaderStore);

  return (
    <PageHeaderContext.Provider value={store}>
      {children}
    </PageHeaderContext.Provider>
  );
}
