import { z } from "zod";
import { config } from "../config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** edit_image 工具参数 Schema */
const EditImageSchema = {
  image: z.string().describe("必须是一个有效的图片 URL，用于作为被编辑的基础图片。只支持 HTTP/HTTPS 链接。"),
  prompt: z.string().describe("描述你想如何修改这张图片的详细提示词（建议使用英文）"),
  n: z.number().min(1).max(4).default(1).describe("生成图片的数量（默认为 1）"),
  size: z.enum(["256x256", "512x512", "1024x1024"]).default("1024x1024").describe("图片尺寸，默认 1024x1024"),
};

/** 图像编辑 API 响应格式 */
interface ImageEditResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

export function registerEditImageTool(server: McpServer) {
  server.registerTool(
    "edit_image",
    {
      title: "Edit Image",
      description: "根据 URL 提供的一张图片和提示词，对图片进行修改和重新生成。",
      inputSchema: EditImageSchema,
    },
    async ({ image, prompt, n, size }) => {
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

      console.log(`🎨 收到修图请求: URL="${image}", Prompt="${prompt}"`);

      try {
        const requestBody = {
          model: config.editModel,
          image,
          prompt,
          n,
          size,
          response_format: "url",
        };

        const response = await fetch(`${config.apiBaseUrl}/images/edits`, {
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

        const data = (await response.json()) as ImageEditResponse;
        const content: Array<{ type: "text"; text: string }> = [];

        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item.url) {
              content.push({
                type: "text" as const,
                text: `编辑完成的图片链接: ${item.url}`,
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
              text: `❌ 图像编辑失败: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
