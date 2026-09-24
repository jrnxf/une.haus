export function formatActorNames(names: string[], count: number): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  const remaining = count - names.length
  if (remaining > 0) {
    return `${names[0]}, ${names[1]} and ${remaining} other${remaining > 1 ? "s" : ""}`
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}
