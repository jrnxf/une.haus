import { type UserVideoItem } from "~/lib/users/fns"

/** Label and destination for the entity a user video belongs to */
export function getVideoSource(item: UserVideoItem): {
  label: string
  url: string
} {
  switch (item.type) {
    case "post": {
      return {
        label: `post: ${item.title ?? "untitled"}`,
        url: `/posts/${item.id}`,
      }
    }
    case "riuSet": {
      return {
        label: `riu set: ${item.title ?? "untitled"}`,
        url: `/games/rius/sets/${item.id}`,
      }
    }
    case "riuSubmission": {
      return {
        label: `riu submission: ${item.title ?? "a set"}`,
        url: `/games/rius/submissions/${item.id}`,
      }
    }
    case "biuSet": {
      return {
        label: `biu set: ${item.title ?? "untitled"}`,
        url: `/games/bius/sets/${item.id}`,
      }
    }
    case "siuSet": {
      return {
        label: `siu set: ${item.title ?? "untitled"}`,
        url: `/games/sius/sets/${item.id}`,
      }
    }
    case "trickVideo": {
      return {
        label: `trick: ${item.title ?? "a trick"}`,
        url: item.trickId ? `/tricks/${item.trickId}` : "/tricks",
      }
    }
  }
}
