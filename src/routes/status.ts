/**
 * 状态面板路由
 */

import { Router, Request, Response } from "express";
import { stats } from "../utils/stats.js";
import { createStatusData, renderStatusHtml } from "../views/status.html.js";
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * 创建状态面板路由
 * @param transports MCP 传输层 Map（用于获取活跃会话数）
 */
export function createStatusRouter(
  transports: Map<string, StreamableHTTPServerTransport>
): Router {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    const statusData = createStatusData(stats, transports.size);

    const accept = _req.headers.accept || "";
    if (accept.includes("text/html")) {
      res.send(renderStatusHtml(statusData));
      return;
    }

    res.status(200).json(statusData);
  });

  return router;
}
