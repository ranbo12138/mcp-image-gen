import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// === 环境变量配置 ===
const CONFIG = {
  apiUrl: process.env.IMAGE_API_URL || "https://site.atopes.de/v1/chat/completions",
  apiKey: process.env.IMAGE_API_KEY,
  model: process.env.IMAGE_MODEL || "gemini-3-pro-image-preview-1",
  port: process.env.PORT || 3000
};

// === 创建 MCP 服务器 ===
const server = new Server(
  {
    name: "image-generator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// === 注册工具 (跟之前一样) ===
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description: "根据文字描述生成图片。",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "详细的图片描述 (英文效果更佳)。",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// === 工具逻辑 (跟之前一样) ===
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_image") {
    const { prompt } = request.params.arguments;
    console.log(`收到生图请求: ${prompt}`);

    if (!CONFIG.apiKey) {
      throw new Error("服务端未配置 API Key");
    }

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CONFIG.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          model: CONFIG.model,
          messages: [{ role: "user", content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const imageUrl = await parseStreamResponse(response);

      return {
        content: [
          { type: "image", data: imageUrl, mimeType: "image/png" }
        ],
      };
    } catch (error) {
      console.error("生图出错:", error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
  throw new Error("Unknown tool");
});

// === 辅助函数 (解析流) ===
async function parseStreamResponse(response) {
  // ... 这里放之前那个解析流的代码 ...
  // 为了篇幅我简写了，记得把之前那个 parseStreamResponse 函数完整复制过来哦！
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content;
          if (content && content.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp)/i)) {
            return content.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp)/i)[0];
          }
        } catch (e) {}
      }
    }
  }
  throw new Error("No image URL found");
}

// === Express 服务器设置 (这是新的部分!) ===
const app = express();
let transport;

// SSE 端点：客户端通过这个连接
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

// 消息处理端点：客户端发消息到这里
app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Session not found");
  }
});

app.listen(CONFIG.port, () => {
  console.log(`✨ MCP Server running on port ${CONFIG.port}`);
});
