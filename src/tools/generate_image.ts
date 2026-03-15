import { z } from "zod";
import { config } from "../config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ImageGenerationResponse,
  ImageGenerationRequest,
} from "../types/index.js";

/** 支持的图像宽高比 */
const AspectRatioSchema = z
  .enum(["16:9", "9:16", "1:1", "2:3", "3:2"])
  .default("2:3");

/** generate_image 工具参数 Schema */
const GenerateImageSchema = {
  prompt: z
    .string()
    .describe("图像的详细描述提示词（建议使用英文以获得最佳效果）"),
  n: z.number().min(1).max(4).default(1).describe("生成图片的数量（默认为 1）"),
  size: AspectRatioSchema.describe(
    "图片宽高比：'16:9' (横屏)、'9:16' (竖屏)、'1:1' (正方形)、'2:3' (竖向，默认)、'3:2' (横向)"
  ),
};

/** 图像生成输出 Schema */
const ImageGenerationOutputSchema = z.object({
  success: z.boolean().describe("操作是否成功"),
  images: z
    .array(
      z.object({
        url: z.string().describe("生成的图片 URL"),
      })
    )
    .describe("生成的图片列表"),
  error: z.string().optional().describe("错误信息（如果失败）"),
});

export function registerGenerateImageTool(server: McpServer) {
  server.registerTool(
    "generate_image",
    {
      title: "Generate Image",
      description:
        "调用云端 AI 模型生成图像。支持 5 种宽高比：16:9 (横屏)、9:16 (竖屏)、1:1 (正方形)、2:3 (竖向)、3:2 (横向)。",
      inputSchema: GenerateImageSchema,
      outputSchema: ImageGenerationOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ prompt, n, size }) => {
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

      console.log(`🎨 收到生图请求: "${prompt}" [Ratio: ${size}, N: ${n}]`);

      try {
        const requestBody: ImageGenerationRequest = {
          model: config.imageModel,
          prompt,
          n,
          size,
          response_format: "url",
          stream: false,
        };

        // 使用 AbortController 设置超时 (2分钟)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(`${config.apiBaseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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

        const data = (await response.json()) as ImageGenerationResponse;
        const images: Array<{ url: string }> = [];

        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item.url) {
              images.push({ url: item.url });
            }
          }
        }

        if (images.length === 0) {
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

        // 返回结构化内容和文本内容
        return {
          content: images.map((img) => ({
            type: "text" as const,
            text: `生成的图片链接: ${img.url}`,
          })),
          structuredContent: {
            success: true,
            images,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("执行出错:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ 图像生成失败: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
