/**
 * Safari bug workaround. Using backdrop-blur-[0px] forces compositor to respect safe-area-inset on fixed
 * elements. Without this, fixed overlays incorrectly render into the status bar area.
 */
export function SafariSafeAreaFix() {
  return (
    <div
      className="pointer-events-none fixed inset-0 backdrop-blur-[0px]"
      aria-hidden="true"
    />
  )
}
