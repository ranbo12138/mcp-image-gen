/**
 * MCP 端点路由
 * 处理 MCP 协议的 POST/GET/DELETE 请求
 */

import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { stats, recordToolRegistration } from "../utils/stats.js";

// 工具注册函数
import { registerGenerateImageTool } from "../tools/generate_image.js";
import { registerEditImageTool } from "../tools/edit_image.js";
import { registerGenerateVideoTool } from "../tools/generate_video.js";

/**
 * 创建 MCP 服务器实例并注册所有工具
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "cloud-media-generator",
      version: "3.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerGenerateImageTool(server);
  recordToolRegistration("generate_image");

  registerEditImageTool(server);
  recordToolRegistration("edit_image");

  registerGenerateVideoTool(server);
  recordToolRegistration("generate_video");

  return server;
}

/**
 * 创建 MCP 路由
 * @param transports MCP 传输层 Map
 */
export function createMcpRouter(
  transports: Map<string, StreamableHTTPServerTransport>
): Router {
  const router = Router();

  // POST /mcp - 处理 MCP 请求
  router.post("/mcp", async (req: Request, res: Response) => {
    stats.totalRequests++;

    // 调试日志：记录所有请求
    console.log(`📥 [MCP] POST 请求:`, JSON.stringify(req.body, null, 2));

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      console.log(`🔌 [MCP] 新连接请求自: ${req.ip}`);

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          transports.set(sessionId, transport);
          console.log(`✨ [MCP] 会话创建: ${sessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          console.log(`❌ [MCP] 会话关闭: ${transport.sessionId}`);
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  // GET /mcp - SSE 通知
  router.get("/mcp", async (req: Request, res: Response) => {
    console.log(`📤 [MCP] GET 请求 (SSE) 来自: ${req.ip}`);
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.log(`   Session ID: ${sessionId}`);

    if (!sessionId || !transports.has(sessionId)) {
      console.log(`   ❌ 无效或缺失 Session ID`);
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    console.log(`   ✅ 建立 SSE 连接`);
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp - 会话终止
  router.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  return router;
}
