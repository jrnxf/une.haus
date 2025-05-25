import { Badge } from "~/components/ui/badge";

export function Badges({ content }: { content: null | string[] }) {
  if (!content || content.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {content.map((item) => (
        <Badge className="border-border" key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  );
}
