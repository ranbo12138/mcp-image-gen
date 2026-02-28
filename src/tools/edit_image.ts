import { z } from "zod";
import { config } from "../config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FormData } from "formdata-node";

/** 统一转换图片参数为 Base64 data URL 或 HTTP URL 字符串 */
function resolveImageUrl(input: unknown): string {
  if (typeof input === "string") return input;

  const img = input as any;

  if (img?.image_url) return img.image_url.url;

  if (img?.inline_data) {
    return `data:${img.inline_data.mime_type};base64,${img.inline_data.data}`;
  }

  throw new Error("不支持的图片格式");
}

/** edit_image 工具参数 Schema */
const EditImageSchema = {
  image: z.union([
    z.string(),
    z.object({
      image_url: z.object({ url: z.string() })
    }),
    z.object({
      inline_data: z.object({
        mime_type: z.string(),
        data: z.string()
      })
    })
  ]).describe("图片参数，支持 HTTP URL 字符串、OpenAI image_url 格式、或 Gemini inline_data 格式"),
  prompt: z.string().describe("描述你想如何修改这张图片的详细提示词（建议使用英文）"),
  n: z.number().min(1).max(4).default(1).describe("生成图片的数量（默认为 1）"),
  size: z.enum(["256x256", "512x512", "1024x1024"]).default("1024x1024").describe("图片尺寸，默认 1024x1024"),
};

/** 图像编辑 API 响应格式 */
interface ImageEditResponse {
  choices?: Array<{
    message?: {
      content?: string;
    }
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
              text: "❌ 服务端未配置 API Key，无法修改图像。请设置 API_KEY 环境变量。",
            },
          ],
          isError: true,
        };
      }

      const imageUrl = resolveImageUrl(image);
      console.log(`🎨 收到修图请求: Prompt="${prompt}"`);

      try {
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ];

        const requestBody = {
          model: config.editModel || "grok-imagine-1.0-edit",
          messages: messages,
          stream: false,
        };

        const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
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
        let resultUrl = "";

        if (data.choices && data.choices[0]?.message?.content) {
          resultUrl = data.choices[0].message.content;
        }

        if (!resultUrl) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ API 返回成功，但未能提取到图片内容: ${JSON.stringify(data)}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `编辑完成的信息/图片链接: ${resultUrl}`,
            }
          ]
        };
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