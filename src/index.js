import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "./mcp-server.js";
import { CONFIG } from "./config.js";
import cors from "cors"; // 引入 CORS

const app = express();

// === 关键修复: 启用 CORS 允许跨域访问 ===
// 这允许 RikkaHub 等第三方网页客户端连接此服务
app.use(cors({
  origin: "*", // 允许任何来源
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 1. 解析 JSON 请求体
app.use(express.json());

// 2. Session 管理器
const sessions = new Map();

// 3. SSE 连接端点
app.get("/sse", async (req, res) => {
  console.log(`🔌 [SSE] 新连接请求自: ${req.ip}`);

  // 禁用 Nginx 缓冲
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Cache-Control", "no-cache"); 
  
  // 创建 Transport
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  
  console.log(`✨ [SSE] 会话创建: ${sessionId}`);
  sessions.set(sessionId, transport);

  // 心跳机制
  const keepAliveInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 15000);

  req.on("close", () => {
    console.log(`❌ [SSE] 连接断开: ${sessionId}`);
    clearInterval(keepAliveInterval);
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

// 启动服务器
app.listen(CONFIG.PORT, "0.0.0.0", () => {
  console.log(`✨ MCP Image Server running on port ${CONFIG.PORT} (0.0.0.0)`);
  console.log(`👉 SSE Endpoint: http://localhost:${CONFIG.PORT}/sse`);
});
