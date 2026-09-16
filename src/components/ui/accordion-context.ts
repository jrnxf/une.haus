import { createContext, useContext } from "react"

export type AccordionVariant = "default" | "card"

export const AccordionVariantContext =
  createContext<AccordionVariant>("default")

export function useAccordionVariant() {
  return useContext(AccordionVariantContext)
}
