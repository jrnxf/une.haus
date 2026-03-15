import { renderMermaidSVG } from "beautiful-mermaid"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"

export function Mermaid({ chart }: { chart: string }) {
  try {
    const svg = renderMermaidSVG(chart, {
      bg: "var(--color-fd-background)",
      fg: "var(--color-fd-foreground)",
      interactive: true,
      transparent: true,
    })

    return <div dangerouslySetInnerHTML={{ __html: svg }} />
  } catch {
    return (
      <CodeBlock title="mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    )
  }
}
