/**
 * MCP 媒体生成服务器
 * 使用 StreamableHTTPServerTransport 实现远程访问
 */

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import { config } from "./config.js";

import { registerGenerateImageTool } from "./tools/generate_image.js";
import { registerEditImageTool } from "./tools/edit_image.js";
import { registerGenerateVideoTool } from "./tools/generate_video.js";

// ============================================================================
// 统计计数器
// ============================================================================

const stats = {
  startTime: Date.now(),
  totalRequests: 0,
  toolCalls: {
    generate_image: 0,
    edit_image: 0,
    generate_video: 0,
  },
};

// ============================================================================
// 工具调用追踪包装器
// ============================================================================

function wrapToolRegistration(server: McpServer, toolName: string, registerFn: (server: McpServer) => void) {
  registerFn(server);
  stats.toolCalls[toolName as keyof typeof stats.toolCalls]++;
}

// ============================================================================
// 创建 MCP 服务器实例并注册所有工具
// ============================================================================

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
  stats.toolCalls.generate_image++;
  
  registerEditImageTool(server);
  stats.toolCalls.edit_image++;
  
  registerGenerateVideoTool(server);
  stats.toolCalls.generate_video++;

  return server;
}

// ============================================================================
// Express 服务器设置
// ============================================================================

const app = express();

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
  })
);

app.use(express.json());

const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// ============================================================================
// MCP 端点处理
// ============================================================================

app.post("/mcp", async (req: Request, res: Response) => {
  stats.totalRequests++;
  
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

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

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
    version: "3.1.0",
  });
});

// ============================================================================
// 状态监控面板
// ============================================================================

app.get("/status", (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  const memUsage = process.memoryUsage();
  
  const statusData = {
    server: {
      version: "3.1.0",
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptimeSeconds: uptime,
    },
    requests: {
      total: stats.totalRequests,
    },
    tools: {
      generate_image: stats.toolCalls.generate_image,
      edit_image: stats.toolCalls.edit_image,
      generate_video: stats.toolCalls.generate_video,
      total: stats.toolCalls.generate_image + stats.toolCalls.edit_image + stats.toolCalls.generate_video,
    },
    sessions: {
      active: transports.size,
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
  };

  const accept = _req.headers.accept || "";
  if (accept.includes("text/html")) {
    res.send(`
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Media Server - Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { 
      color: #fff; 
      text-align: center; 
      margin-bottom: 40px;
      font-size: 2.5em;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .card h2 { 
      color: #4ecdc4; 
      margin-bottom: 20px; 
      font-size: 1.3em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat-item {
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value { 
      font-size: 2em; 
      font-weight: bold; 
      color: #fff;
    }
    .stat-label { 
      color: #aaa; 
      margin-top: 5px;
      font-size: 0.9em;
    }
    .tool-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      margin-bottom: 10px;
    }
    .tool-name { color: #fff; font-weight: 500; }
    .tool-count { 
      background: #4ecdc4; 
      color: #1a1a2e; 
      padding: 5px 15px; 
      border-radius: 20px;
      font-weight: bold;
    }
    .status-ok {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #4ecdc4;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎛️ MCP Media Server</h1>
    
    <div class="card">
      <h2><span class="status-ok"></span> 服务器状态</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${statusData.server.uptime}</div>
          <div class="stat-label">运行时间</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statusData.requests.total}</div>
          <div class="stat-label">总请求数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statusData.sessions.active}</div>
          <div class="stat-label">活跃会话</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>📊 工具调用统计</h2>
      <div class="tool-item">
        <span class="tool-name">🖼️ generate_image</span>
        <span class="tool-count">${statusData.tools.generate_image}</span>
      </div>
      <div class="tool-item">
        <span class="tool-name">✏️ edit_image</span>
        <span class="tool-count">${statusData.tools.edit_image}</span>
      </div>
      <div class="tool-item">
        <span class="tool-name">🎬 generate_video</span>
        <span class="tool-count">${statusData.tools.generate_video}</span>
      </div>
    </div>
    
    <div class="card">
      <h2>💾 内存使用</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${statusData.memory.rss}</div>
          <div class="stat-label">RSS</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statusData.memory.heapUsed}</div>
          <div class="stat-label">Heap Used</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statusData.memory.heapTotal}</div>
          <div class="stat-label">Heap Total</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; color: #666; margin-top: 30px;">
      <small>v${statusData.server.version} | Auto-refresh in 30s</small>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>
    `);
    return;
  }
  
  res.status(200).json(statusData);
});

// ============================================================================
// 启动服务器
// ============================================================================

app.listen(config.port, "0.0.0.0", () => {
  console.log(`✨ MCP Media Server v3.1.0 运行在端口 ${config.port} (0.0.0.0)`);
  console.log(`👉 MCP Endpoint: http://localhost:${config.port}/mcp`);
  console.log(`👉 Health Check: http://localhost:${config.port}/health`);
  console.log(`👉 Status Panel: http://localhost:${config.port}/status`);
});
