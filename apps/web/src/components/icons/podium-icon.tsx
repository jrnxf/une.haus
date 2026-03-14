import { forwardRef, type SVGProps } from "react"

export const PodiumIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function PodiumIcon(props, ref) {
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
        {/* 1st place - center, tallest (rounded top corners, sharp bottom) */}
        <path d="M9 4h6a1 1 0 0 1 1 1v16H8V5a1 1 0 0 1 1-1Z" />
        {/* 2nd place - left (rounded top + bottom-left, sharp bottom-right) */}
        <path d="M2 10h5a1 1 0 0 1 1 1v10H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
        {/* 3rd place - right (rounded top + bottom-right, sharp bottom-left) */}
        <path d="M17 13h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6v-7a1 1 0 0 1 1-1Z" />
      </svg>
    )
  },
)
