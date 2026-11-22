import { getStatsTool, recentActivityTool } from "~/mcp/tools/activity"
import { getChainRoundTool, getChainSetTool } from "~/mcp/tools/chains"
import {
  getRiuRoundTool,
  getRiuSetTool,
  listRiuWinnersTool,
  listSubmissionsTool,
} from "~/mcp/tools/games"
import { getPostTool, listPostsTool } from "~/mcp/tools/posts"
import { listRoundsTool } from "~/mcp/tools/rounds"
import {
  searchTricksTool,
  searchUsersTool,
  searchVideosTool,
} from "~/mcp/tools/search"
import { getTrickTool } from "~/mcp/tools/tricks"
import { getUserTool } from "~/mcp/tools/users"
import { getVideoTool } from "~/mcp/tools/videos"

// Every read tool that works on any une.haus database. The local server and
// the Worker both serve this list. The raw `query` tool is not here: it
// needs the read-only REST path and stays on the local server.
export const readTools = [
  getUserTool,
  searchUsersTool,
  searchTricksTool,
  searchVideosTool,
  getVideoTool,
  listPostsTool,
  getPostTool,
  getRiuRoundTool,
  getRiuSetTool,
  listRiuWinnersTool,
  listSubmissionsTool,
  listRoundsTool,
  getChainRoundTool,
  getChainSetTool,
  getTrickTool,
  recentActivityTool,
  getStatsTool,
]
