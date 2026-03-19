import { z } from 'zod';
import { config } from '../config.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ImageEditResponse,
  ChatCompletionRequest,
  ChatMessage,
} from '../types/index.js';
import {
  ImageUrlContentSchema,
  formatZodError,
  normalizeImageUrlContent,
} from '../utils/image-input.js';

/** edit_image 工具参数 Schema */
const EditImageSchema = {
  image_url: ImageUrlContentSchema.describe(
    '基础图片，必须使用 OpenAI 标准 image_url 对象，支持 http(s) URL 或 data URL。'
  ),
  prompt: z
    .string()
    .describe('描述你想如何修改这张图片的详细提示词（建议使用英文）'),
  // 注：n 参数已移除，上游 API 限制每次只能返回 1-2 张图片
  size: z
    .enum(['256x256', '512x512', '1024x1024'])
    .default('1024x1024')
    .describe('图片尺寸，默认 1024x1024'),
};

/** 图像编辑输出 Schema */
const ImageEditOutputSchema = z.object({
  success: z.boolean().describe('操作是否成功'),
  result: z.string().describe('编辑结果（图片链接或信息）'),
  error: z.string().optional().describe('错误信息（如果失败）'),
});

export function registerEditImageTool(server: McpServer) {
  server.registerTool(
    "edit_image",
    {
      title: "Edit Image",
      description:
        '根据提供的图片和提示词，对图片进行修改和重新生成。image_url 必须使用 OpenAI 标准对象格式。',
      inputSchema: EditImageSchema,
      outputSchema: ImageEditOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ image_url, prompt }) => {
      if (!config.apiKey) {
        return {
          content: [
            {
              type: 'text' as const,
              text: '❌ 服务端未配置 API Key，无法修改图像。请设置 API_KEY 环境变量。',
            },
          ],
          isError: true,
        };
      }

      const imageResult = ImageUrlContentSchema.safeParse(image_url);
      if (!imageResult.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatZodError('edit_image 参数不合法', imageResult.error),
            },
          ],
          isError: true,
        };
      }

      const normalizedImageUrl = normalizeImageUrlContent(imageResult.data);

      console.log(
        `🎨 收到修图请求: URL="${normalizedImageUrl.image_url.url}", Prompt="${prompt}"`
      );

      try {
        const messages: ChatMessage[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              normalizedImageUrl,
            ],
          },
        ];

        const requestBody: ChatCompletionRequest = {
          model: config.editModel || 'grok-imagine-1.0-edit',
          messages: messages,
          stream: false,
        };

        const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
                type: 'text' as const,
                text: `❌ API 请求失败: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = (await response.json()) as ImageEditResponse;
        let resultUrl = '';

        if (data.choices && data.choices[0]?.message?.content) {
          resultUrl = data.choices[0].message.content;
        }

        if (!resultUrl) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ API 返回成功，但未能提取到图片内容: ${JSON.stringify(data)}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `编辑完成的信息/图片链接: ${resultUrl}`,
            },
          ],
          structuredContent: {
            success: true,
            result: resultUrl,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('执行出错:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ 图像编辑失败: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
