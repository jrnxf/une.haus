import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type MaxWidth = "lg" | "2xl" | "4xl" | "full";

type PageHeaderState = {
  breadcrumbs: ReactNode | null;
  tabs: ReactNode | null;
  actions: ReactNode | null;
  widget: ReactNode | null;
  mobileRow: ReactNode | null;
  maxWidth: MaxWidth;
};

const EMPTY_STATE: PageHeaderState = {
  breadcrumbs: null,
  tabs: null,
  actions: null,
  widget: null,
  mobileRow: null,
  maxWidth: "full",
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
    throw new Error("usePageHeader must be used within PageHeaderProvider");
  return store;
}

export function usePageHeader() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function usePageHeaderStore() {
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
