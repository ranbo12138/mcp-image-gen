import { z } from "zod";
import { config } from "../config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** generate_video 工具参数 Schema */
const GenerateVideoSchema = {
  prompt: z.string().describe("描述你想要生成的视频的详细提示词（建议使用英文）"),
  image_url: z.string().optional().describe("作为视频生成起点的静态图片URL（可选）。支持 HTTP/HTTPS 链接。"),
};

/** 视频生成 API 响应格式 */
interface VideoGenerationResponse {
  data: Array<{
    url?: string;
  }>;
}

export function registerGenerateVideoTool(server: McpServer) {
  server.registerTool(
    "generate_video",
    {
      title: "Generate Video",
      description: "调用 AI 模型，将文本提示词或静态图片转换为短视频。",
      inputSchema: GenerateVideoSchema,
    },
    async ({ prompt, image_url }) => {
      if (!config.apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ 服务端未配置 API Key，无法生成视频。请设置 API_KEY 环境变量。",
            },
          ],
          isError: true,
        };
      }

      console.log(`🎬 收到视频生成请求: Prompt="${prompt}", Image="${image_url || 'N/A'}"`);

      try {
        const requestBody: any = {
          model: config.videoModel,
          prompt,
        };
        
        if (image_url) {
          requestBody.image_url = image_url;
        }

        const response = await fetch(`${config.apiBaseUrl}/videos/generations`, {
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

        const data = (await response.json()) as VideoGenerationResponse;
        const content: Array<{ type: "text"; text: string }> = [];

        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item.url) {
              content.push({
                type: "text" as const,
                text: `生成的视频链接: ${item.url}`,
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
              text: `❌ 视频生成失败: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
