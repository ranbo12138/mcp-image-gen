import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "./mcp-server.js";
import { CONFIG } from "./config.js";

const app = express();

// 1. 关键：解析 JSON 请求体，处理 POST /messages 必须
app.use(express.json());

// 变量存储当前的 Transport 实例
// 注意：这是一个简单的单实例实现。如果在多用户并发场景下，可能需要 Map<SessionID, Transport>
// 但对于 Zeabur + 本地单人调用场景，这已经足够。
let transport;

// 2. SSE 连接端点
app.get("/sse", async (req, res) => {
  console.log("🔌 新的 SSE 连接请求");
  
  // 创建新的 SSE Transport
  transport = new SSEServerTransport("/messages", res);
  
  // 将 MCP Server 连接到这个 Transport
  await mcpServer.connect(transport);
  
  // 连接断开时的清理
  req.on("close", () => {
    console.log("❌ SSE 连接断开");
    // 这里可以做一些清理工作，但 mcp-sdk 通常会自动处理
  });
});

// 3. 消息接收端点
app.post("/messages", async (req, res) => {
  if (transport) {
    // 将收到的消息转发给 Transport 处理
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("No active session");
  }
});

// 健康检查端点 (Zeabur 等平台通常需要)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 启动服务器
app.listen(CONFIG.PORT, () => {
  console.log(`✨ MCP Image Server is running on port ${CONFIG.PORT}`);
  console.log(`👉 SSE Endpoint: http://localhost:${CONFIG.PORT}/sse`);
});
