import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const ContentContext = createContext<ReactNode>(null)
const SetterContext = createContext<(node: ReactNode) => void>(() => {})

export function MobileBreadcrumbsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [content, setContent] = useState<ReactNode>(null)
  const setter = useMemo(() => setContent, [])

  return (
    <SetterContext.Provider value={setter}>
      <ContentContext.Provider value={content}>
        {children}
      </ContentContext.Provider>
    </SetterContext.Provider>
  )
}

export function useMobileBreadcrumbs() {
  return useContext(ContentContext)
}

export function useSetMobileBreadcrumbs() {
  return useContext(SetterContext)
}
