import { getRiuRoundTool, getRiuSetTool } from "~/mcp/tools/games"
import { getPostTool, listPostsTool } from "~/mcp/tools/posts"
import {
  searchTricksTool,
  searchUsersTool,
  searchVideosTool,
} from "~/mcp/tools/search"
import { getUserTool } from "~/mcp/tools/users"

// Every read tool that works on any une.haus database. The local server and
// the Worker both serve this list. The raw `query` tool is not here: it
// needs the read-only REST path and stays on the local server.
export const readTools = [
  getUserTool,
  searchUsersTool,
  searchTricksTool,
  searchVideosTool,
  listPostsTool,
  getPostTool,
  getRiuRoundTool,
  getRiuSetTool,
]
