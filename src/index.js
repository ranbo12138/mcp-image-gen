import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "./mcp-server.js";
import { CONFIG } from "./config.js";

const app = express();

// 1. 解析 JSON 请求体
app.use(express.json());

// 2. Session 管理器
const sessions = new Map();

// 3. SSE 连接端点
app.get("/sse", async (req, res) => {
  console.log(`🔌 [SSE] 新连接请求自: ${req.ip}`);

  // === 关键修复 1: 禁用 Nginx 缓冲 (解决 Zeabur 上的 SSE 延迟/断连) ===
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Cache-Control", "no-cache"); 
  
  // 创建 Transport
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  
  console.log(`✨ [SSE] 会话创建: ${sessionId}`);
  sessions.set(sessionId, transport);

  // === 关键修复 2: 心跳机制 (防止负载均衡器 15s/60s 切断空闲连接) ===
  // SSE 允许以冒号开头的注释行，客户端会忽略，但能保持连接活跃
  const keepAliveInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 15000); // 每 15 秒发一次心跳

  req.on("close", () => {
    console.log(`❌ [SSE] 连接断开: ${sessionId}`);
    clearInterval(keepAliveInterval); // 清理定时器
    sessions.delete(sessionId);
  });

  try {
    await mcpServer.connect(transport);
  } catch (error) {
    console.error(`💥 [SSE] 连接错误: ${sessionId}`, error);
    clearInterval(keepAliveInterval);
    sessions.delete(sessionId);
  }
});

// 4. 消息接收端点
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  const transport = sessions.get(sessionId);

  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`💥 [POST] 消息处理出错: ${sessionId}`, error);
    res.status(500).send(error.message);
  }
});

// 5. 健康检查
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", activeSessions: sessions.size });
});

// === 关键修复 3: 显式监听 0.0.0.0 ===
// 在 Docker 环境中，必须监听 0.0.0.0，否则外部无法访问 (导致 502)
app.listen(CONFIG.PORT, "0.0.0.0", () => {
  console.log(`✨ MCP Image Server running on port ${CONFIG.PORT} (0.0.0.0)`);
  console.log(`👉 SSE Endpoint: http://localhost:${CONFIG.PORT}/sse`);
});
