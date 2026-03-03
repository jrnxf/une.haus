import { forwardRef, type SVGProps } from "react"

export const StackItUpIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function StackItUpIcon(props, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {/* Layers stacking upward with arrow */}
        <path d="M12 2v8" />
        <path d="m9 5 3-3 3 3" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <line x1="8" y1="20" x2="16" y2="20" />
      </svg>
    )
  },
)
