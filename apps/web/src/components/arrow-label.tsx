import { ArrowRightIcon } from "lucide-react"

export function ArrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
    </>
  )
}
