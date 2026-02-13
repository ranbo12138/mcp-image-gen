import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "./config.js";

// 创建 MCP 服务器实例
export const mcpServer = new Server(
  {
    name: "cloud-image-generator",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// === 1. 定义工具 ===
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description: "调用云端 AI 模型生成图像。支持自定义尺寸、数量和返回格式。",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "图像的详细描述提示词 (建议使用英文以获得最佳效果)",
            },
            n: {
              type: "integer",
              minimum: 1,
              maximum: 4, // 限制最大数量以防超时或超出配额
              default: 1,
              description: "生成图片的数量 (默认为 1)",
            },
            size: {
              type: "string",
              // 根据 API 文档支持的格式
              anyOf: [
                { enum: ["1024x1024", "16:9", "9:16", "3:2", "2:3", "1:1"] },
                { pattern: "^\\d+x\\d+$" } // 允许自定义分辨率字符串如 "1280x720"
              ],
              default: CONFIG.DEFAULT_SIZE,
              description: "图片尺寸或比例 (如 '1024x1024', '16:9', '9:16')",
            },
            response_format: {
              type: "string",
              enum: ["b64_json", "url"],
              default: "b64_json",
              description: "返回格式：'b64_json' (直接返回图片内容，推荐) 或 'url' (返回图片链接)",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// === 2. 实现工具逻辑 ===
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_image") {
    const args = request.params.arguments;
    const prompt = args.prompt;
    const n = args.n || 1;
    const size = args.size || CONFIG.DEFAULT_SIZE;
    const responseFormat = args.response_format || "url";

    if (!CONFIG.API_KEY) {
      throw new Error("服务端未配置 API Key，无法生成图像。");
    }

    console.log(`🎨 收到生图请求: "${prompt}" [Size: ${size}, N: ${n}, Format: ${responseFormat}]`);

    try {
      // 构造请求体
      const requestBody = {
        model: CONFIG.DEFAULT_MODEL,
        prompt: prompt,
        n: n,
        size: size,
        response_format: responseFormat,
        stream: false, // 我们使用非流式请求以简化 MCP 响应处理
      };

      // 调用上游 API
      const response = await fetch(`${CONFIG.API_BASE_URL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CONFIG.API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status}`, errorText);
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = [];

      // 处理返回结果
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (responseFormat === "b64_json" && item.b64_json) {
            // 返回 Base64 图片 (MCP Image Content)
            content.push({
              type: "image",
              data: item.b64_json,
              mimeType: "image/png", // 假设 API 返回 PNG，通常是这样
            });
          } else if (item.url) {
            // 返回 URL (MCP Text Content)
            content.push({
              type: "text",
              text: `生成的图片链接: ${item.url}`,
            });
          }
        }
      }

      if (content.length === 0) {
        throw new Error("API 返回的数据为空或格式无法解析");
      }

      return {
        content: content,
      };

    } catch (error) {
      console.error("执行出错:", error);
      return {
        content: [{ type: "text", text: `❌ 图像生成失败: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});
