import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "./mcp-server.js";
import { CONFIG } from "./config.js";

const app = express();

// 1. 解析 JSON 请求体
app.use(express.json());

// 2. Session 管理器 (Map<sessionId, transport>)
const sessions = new Map();

// 3. SSE 连接端点
app.get("/sse", async (req, res) => {
  console.log(`🔌 [SSE] 新连接请求自: ${req.ip}`);

  // 创建新的 Transport
  // 注意："/messages" 是客户端将要发送 POST 请求的路径前缀
  const transport = new SSEServerTransport("/messages", res);
  
  // 此时 transport.sessionId 已经自动生成 (UUID)
  const sessionId = transport.sessionId;
  console.log(`✨ [SSE] 会话创建: ${sessionId}`);

  // 存储 Session
  sessions.set(sessionId, transport);

  // 监听关闭事件 (客户端断开或网络中断)
  req.on("close", () => {
    console.log(`❌ [SSE] 连接断开: ${sessionId}`);
    sessions.delete(sessionId);
  });

  try {
    // 连接 MCP Server
    await mcpServer.connect(transport);
    
    // 发送初始日志给客户端 (可选，调试用)
    // transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  } catch (error) {
    console.error(`💥 [SSE] 连接错误: ${sessionId}`, error);
    sessions.delete(sessionId);
  }
});

// 4. 消息接收端点
app.post("/messages", async (req, res) => {
  // 客户端通常会发送请求到 /messages?sessionId=...
  const sessionId =req.query.sessionId;

  if (!sessionId) {
    console.warn("⚠️ [POST] 收到缺少 sessionId 的请求");
    res.status(400).send("Missing sessionId query parameter");
    return;
  }

  const transport = sessions.get(sessionId);

  if (!transport) {
    console.warn(`⚠️ [POST] 找不到会话: ${sessionId} (可能已过期或断开)`);
    res.status(404).send("Session not found");
    return;
  }

  try {
    // 将消息交给对应的 Transport 处理
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`💥 [POST] 消息处理出错: ${sessionId}`, error);
    res.status(500).send(error.message);
  }
});

// 5. 健康检查 (Zeabur 需要)
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

// 启动服务器
app.listen(CONFIG.PORT, () => {
  console.log(`✨ MCP Image Server 2.0 running on port ${CONFIG.PORT}`);
  console.log(`👉 SSE Endpoint: http://localhost:${CONFIG.PORT}/sse`);
  console.log(`💓 Health Check: http://localhost:${CONFIG.PORT}/health`);
});
