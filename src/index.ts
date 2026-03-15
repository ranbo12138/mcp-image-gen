/**
 * MCP 媒体生成服务器
 * 使用 StreamableHTTPServerTransport 实现远程访问
 */

// 开发环境：跳过 SSL 证书验证（解决自签名证书问题）
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createMcpRouter, createHealthRouter, createStatusRouter } from "./routes/index.js";

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

// MCP 传输层会话管理
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// ============================================================================
// 注册路由
// ============================================================================

// MCP 端点
app.use(createMcpRouter(transports));

// 健康检查
app.use(createHealthRouter());

// 状态面板
app.use(createStatusRouter(transports));

// ============================================================================
// 启动服务器
// ============================================================================

app.listen(config.port, "0.0.0.0", () => {
  console.log(`✨ MCP Media Server v3.1.0 运行在端口 ${config.port} (0.0.0.0)`);
  console.log(`👉 MCP Endpoint: http://localhost:${config.port}/mcp`);
  console.log(`👉 Health Check: http://localhost:${config.port}/health`);
  console.log(`👉 Status Panel: http://localhost:${config.port}/status`);
});
