/**
 * MCP 图像生成服务器
 * 使用 StreamableHTTPServerTransport 实现远程访问
 */

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import cors from "cors";
import { config } from "./config.js";

// ============================================================================
// 工具定义
// ============================================================================

/** 支持的图像宽高比 */
const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "2:3", "3:2"]).default("2:3");

/** generate_image 工具参数 Schema */
const GenerateImageSchema = {
  prompt: z.string().describe("图像的详细描述提示词（建议使用英文以获得最佳效果）"),
  n: z.number().min(1).max(4).default(1).describe("生成图片的数量（默认为 1）"),
  size: AspectRatioSchema.describe("图片宽高比：'16:9' (横屏)、'9:16' (竖屏)、'1:1' (正方形)、'2:3' (竖向，默认)、'3:2' (横向)"),
};

/** 图像生成 API 响应格式 */
interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * 创建 MCP 服务器实例
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "cloud-image-generator",
      version: "3.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册 generate_image 工具
  server.registerTool(
    "generate_image",
    {
      title: "Generate Image",
      description: "调用云端 AI 模型生成图像。支持 5 种宽高比：16:9 (横屏)、9:16 (竖屏)、1:1 (正方形)、2:3 (竖向)、3:2 (横向)。",
      inputSchema: GenerateImageSchema,
    },
    async ({ prompt, n, size }) => {
      if (!config.apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ 服务端未配置 API Key，无法生成图像。请设置 API_KEY 环境变量。",
            },
          ],
          isError: true,
        };
      }

      console.log(`🎨 收到生图请求: "${prompt}" [Ratio: ${size}, N: ${n}]`);

      try {
        const requestBody = {
          model: config.imageModel,
          prompt,
          n,
          size,
          response_format: "url",
          stream: false,
        };

        const response = await fetch(`${config.apiBaseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error: ${response.status}`, errorText);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ API 请求失败: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = (await response.json()) as ImageGenerationResponse;
        const content: Array<{ type: "text"; text: string }> = [];

        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item.url) {
              content.push({
                type: "text" as const,
                text: `生成的图片链接: ${item.url}`,
              });
            }
          }
        }

        if (content.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ API 返回的数据为空或格式无法解析",
              },
            ],
            isError: true,
          };
        }

        return { content };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("执行出错:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ 图像生成失败: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// ============================================================================
// Express 服务器设置
// ============================================================================

const app = express();

// CORS 配置 - 允许浏览器客户端访问
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
  })
);

app.use(express.json());

// Session 存储
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// ============================================================================
// MCP 端点处理
// ============================================================================

/**
 * POST /mcp - 客户端到服务器的通信
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    // 复用现有 transport
    transport = transports.get(sessionId)!;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // 新的初始化请求
    console.log(`🔌 [MCP] 新连接请求自: ${req.ip}`);

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        transports.set(sessionId, transport);
        console.log(`✨ [MCP] 会话创建: ${sessionId}`);
      },
    });

    // 清理关闭的 transport
    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        console.log(`❌ [MCP] 会话关闭: ${transport.sessionId}`);
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    // 无效请求
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

  // 处理请求
  await transport.handleRequest(req, res, req.body);
});

/**
 * GET /mcp - SSE 通知（服务器到客户端）
 */
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

/**
 * DELETE /mcp - 会话终止
 */
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// ============================================================================
// 健康检查
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    activeSessions: transports.size,
    version: "3.0.0",
  });
});

// ============================================================================
// 启动服务器
// ============================================================================

app.listen(config.port, "0.0.0.0", () => {
  console.log(`✨ MCP Image Server v3.0.0 运行在端口 ${config.port} (0.0.0.0)`);
  console.log(`👉 MCP Endpoint: http://localhost:${config.port}/mcp`);
  console.log(`👉 Health Check: http://localhost:${config.port}/health`);
});
