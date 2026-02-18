import { forwardRef, type SVGProps } from "react";

export const BracketIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function BracketIcon(props, ref) {
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
        <path d="M2 3h6v6H2" />
        <path d="M2 15h6v6H2" />
        <path d="M8 6h6v12H8" />
        <path d="M14 12h8" />
      </svg>
    );
  },
);
