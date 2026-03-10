import { type ReactNode, useCallback, useEffect, useRef } from "react"

type ScrollspyProps = {
  children: ReactNode
  scrollSelector?: string
  onUpdate?: (id: string) => void
  offset?: number
  smooth?: boolean
  className?: string
  dataAttribute?: string
  history?: boolean
}

function getScrollContainer(selector?: string): HTMLElement | null {
  if (selector) {
    return document.querySelector(selector)
  }
  return document.scrollingElement as HTMLElement | null
}

function getOffsetInContainer(
  element: HTMLElement,
  container: HTMLElement,
): number {
  let offset = 0
  let current: HTMLElement | null = element
  while (current && current !== container) {
    offset += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return offset
}

export function Scrollspy({
  children,
  scrollSelector,
  onUpdate,
  className,
  offset = 0,
  smooth = true,
  dataAttribute = "scrollspy",
  history = true,
}: ScrollspyProps) {
  const selfRef = useRef<HTMLDivElement | null>(null)
  const anchorElementsRef = useRef<Element[] | null>(null)
  const prevIdTracker = useRef<string | null>(null)

  const setActiveSection = useCallback(
    (sectionId: string | null, force = false) => {
      if (!sectionId) return
      for (const item of anchorElementsRef.current ?? []) {
        const id = item.getAttribute(`data-${dataAttribute}-anchor`)
        if (id === sectionId) {
          item.setAttribute("data-active", "true")
        } else {
          item.removeAttribute("data-active")
        }
      }
      if (onUpdate) onUpdate(sectionId)
      if (history && (force || prevIdTracker.current !== sectionId)) {
        window.history.replaceState({}, "", `#${sectionId}`)
      }
      prevIdTracker.current = sectionId
    },
    [dataAttribute, history, onUpdate],
  )

  const handleScroll = useCallback(() => {
    if (!anchorElementsRef.current || anchorElementsRef.current.length === 0)
      return

    const container = getScrollContainer(scrollSelector)
    if (!container) return

    const scrollTop = container.scrollTop

    let activeIdx = 0
    let minDelta = Number.POSITIVE_INFINITY

    for (let idx = 0; idx < anchorElementsRef.current.length; idx++) {
      const anchor = anchorElementsRef.current[idx]
      const sectionId = anchor.getAttribute(`data-${dataAttribute}-anchor`)
      const sectionElement = document.getElementById(sectionId!)
      if (!sectionElement) continue

      let customOffset = offset
      const dataOffset = anchor.getAttribute(`data-${dataAttribute}-offset`)
      if (dataOffset) customOffset = Number.parseInt(dataOffset, 10)

      const top = getOffsetInContainer(sectionElement, container)
      const delta = Math.abs(top - customOffset - scrollTop)

      if (top - customOffset <= scrollTop && delta < minDelta) {
        minDelta = delta
        activeIdx = idx
      }
    }

    const { scrollHeight, clientHeight } = container
    if (scrollTop + clientHeight >= scrollHeight - 2) {
      activeIdx = anchorElementsRef.current.length - 1
    }

    const activeAnchor = anchorElementsRef.current[activeIdx]
    const sectionId =
      activeAnchor?.getAttribute(`data-${dataAttribute}-anchor`) || null

    setActiveSection(sectionId)
  }, [scrollSelector, dataAttribute, offset, setActiveSection])

  const scrollTo = useCallback(
    (anchorElement: HTMLElement) => (event?: Event) => {
      if (event) event.preventDefault()
      const sectionId =
        anchorElement
          .getAttribute(`data-${dataAttribute}-anchor`)
          ?.replace("#", "") || null
      if (!sectionId) return
      const sectionElement = document.getElementById(sectionId)
      if (!sectionElement) return

      const container = getScrollContainer(scrollSelector)
      if (!container) return

      let customOffset = offset
      const dataOffset = anchorElement.getAttribute(
        `data-${dataAttribute}-offset`,
      )
      if (dataOffset) {
        customOffset = Number.parseInt(dataOffset, 10)
      }

      const top = getOffsetInContainer(sectionElement, container)
      container.scrollTo({
        top: top - customOffset,
        left: 0,
        behavior: smooth ? "smooth" : "auto",
      })
      setActiveSection(sectionId, true)
    },
    [dataAttribute, offset, smooth, scrollSelector, setActiveSection],
  )

  const scrollToHashSection = useCallback(() => {
    const hash = CSS.escape(window.location.hash.replace("#", ""))
    if (hash) {
      const targetElement = document.querySelector(
        `[data-${dataAttribute}-anchor="${hash}"]`,
      ) as HTMLElement
      if (targetElement) {
        scrollTo(targetElement)()
      }
    }
  }, [dataAttribute, scrollTo])

  useEffect(() => {
    if (selfRef.current) {
      anchorElementsRef.current = Array.from(
        selfRef.current.querySelectorAll(`[data-${dataAttribute}-anchor]`),
      )
    }

    const currentAnchors = anchorElementsRef.current
    for (const item of currentAnchors ?? []) {
      item.addEventListener("click", scrollTo(item as HTMLElement))
    }

    const container = getScrollContainer(scrollSelector)

    const onScroll = () => {
      handleScroll()
    }

    if (container) {
      container.addEventListener("scroll", onScroll, { passive: true })
    }

    const initialTimeout = setTimeout(() => {
      scrollToHashSection()
      handleScroll()
    }, 100)

    return () => {
      if (container) {
        container.removeEventListener("scroll", onScroll)
      }
      for (const item of currentAnchors ?? []) {
        item.removeEventListener("click", scrollTo(item as HTMLElement))
      }
      clearTimeout(initialTimeout)
    }
  }, [
    scrollSelector,
    handleScroll,
    dataAttribute,
    scrollTo,
    scrollToHashSection,
  ])

  return (
    <div data-slot="scrollspy" className={className} ref={selfRef}>
      {children}
    </div>
  )
}
