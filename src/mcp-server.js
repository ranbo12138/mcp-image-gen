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

// === 尺寸映射到宽高比 ===
function mapSizeToAspectRatio(size) {
  // 直接是比例字符串
  const ratioMap = {
    "16:9": "16:9",
    "9:16": "9:16",
    "1:1": "1:1",
    "2:3": "2:3",
    "3:2": "3:2",
  };
  
  if (ratioMap[size]) {
    return ratioMap[size];
  }
  
  // 解析像素尺寸
  const match = size.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return "2:3"; // 默认值
  }
  
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  
  // 根据尺寸映射到比例
  // 16:9 横屏
  if ((w === 1024 && h === 576) || (w === 1280 && h === 720) || (w === 1536 && h === 864)) {
    return "16:9";
  }
  // 9:16 竖屏
  if ((w === 576 && h === 1024) || (w === 720 && h === 1280) || (w === 864 && h === 1536)) {
    return "9:16";
  }
  // 1:1 正方形
  if ((w === 1024 && h === 1024) || (w === 512 && h === 512)) {
    return "1:1";
  }
  // 2:3 竖向
  if ((w === 1024 && h === 1536) || (w === 512 && h === 768) || (w === 768 && h === 1024)) {
    return "2:3";
  }
  // 3:2 横向
  if ((w === 1536 && h === 1024) || (w === 768 && h === 512) || (w === 1024 && h === 768)) {
    return "3:2";
  }
  
  // 其他值默认 2:3
  return "2:3";
}

// === 1. 定义工具 ===
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description: "调用云端 AI 模型生成图像。支持 5 种宽高比：16:9 (横屏)、9:16 (竖屏)、1:1 (正方形)、2:3 (竖向)、3:2 (横向)。",
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
              maximum: 4,
              default: 1,
              description: "生成图片的数量 (默认为 1)",
            },
            size: {
              type: "string",
              enum: ["16:9", "9:16", "1:1", "2:3", "3:2"],
              default: "2:3",
              description: "图片宽高比：'16:9' (横屏)、'9:16' (竖屏)、'1:1' (正方形)、'2:3' (竖向，默认)、'3:2' (横向)",
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
    const size = mapSizeToAspectRatio(args.size || "2:3");

    if (!CONFIG.API_KEY) {
      throw new Error("服务端未配置 API Key，无法生成图像。");
    }

    console.log(`🎨 收到生图请求: "${prompt}" [Ratio: ${size}, N: ${n}]`);

    try {
      // 构造请求体 - response_format 固定为 url，stream 固定为 false
      const requestBody = {
        model: CONFIG.DEFAULT_MODEL,
        prompt: prompt,
        n: n,
        size: size,
        response_format: "url",
        stream: false,
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

      // 处理返回结果 - 只处理 URL 格式
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.url) {
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
