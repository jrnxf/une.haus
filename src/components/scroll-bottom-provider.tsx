export function ScrollBottomProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/* same idea as seen here in next-themes https://github.com/pacocoursey/next-themes/blob/main/next-themes/src/index.tsx#L197-L201 */}
      <script
        dangerouslySetInnerHTML={{ __html: `(${script.toString()})()` }}
      />
    </>
  )
}

function script() {
  const elements = document.querySelectorAll(".ssr-load-scrolled-to-bottom")
  for (const element of elements) {
    element.scrollTo({ behavior: "instant", top: element.scrollHeight })
  }
}
