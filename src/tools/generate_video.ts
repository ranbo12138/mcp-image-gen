import { z } from "zod";
import { config } from "../config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  VideoGenerationResponse,
  ChatCompletionRequest,
  ChatMessage,
  VideoConfig,
  TextContent,
  ImageUrlContent,
} from "../types/index.js";

/** generate_video 工具参数 Schema */
const GenerateVideoSchema = {
  prompt: z
    .string()
    .describe("描述你想要生成的视频的详细提示词（建议使用英文）"),
  image_url: z
    .string()
    .optional()
    .describe(
      "作为视频生成起点的静态图片URL（可选）。支持 HTTP/HTTPS 链接。"
    ),
  aspect_ratio: z
    .enum(["16:9", "9:16", "1:1", "2:3", "3:2"])
    .optional()
    .describe("视频宽高比，如 16:9、9:16、1:1、2:3、3:2"),
  video_length: z
    .union([z.literal("6"), z.literal("10"), z.literal("15")])
    .optional()
    .describe("视频时长(秒)，可选 6、10、15"),
  resolution_name: z
    .enum(["480p", "720p"])
    .optional()
    .describe("分辨率，可选 480p 或 720p"),
  preset: z
    .enum(["fun", "normal", "spicy", "custom"])
    .optional()
    .describe("风格预设，可选 fun、normal、spicy、custom"),
};

/** 视频生成输出 Schema */
const VideoGenerationOutputSchema = z.object({
  success: z.boolean().describe("操作是否成功"),
  video: z.string().describe("生成的视频链接或信息"),
  error: z.string().optional().describe("错误信息（如果失败）"),
});

export function registerGenerateVideoTool(server: McpServer) {
  server.registerTool(
    "generate_video",
    {
      title: "Generate Video",
      description:
        "调用 AI 模型，将文本提示词或静态图片转换为短视频。",
      inputSchema: GenerateVideoSchema,
      outputSchema: VideoGenerationOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      prompt,
      image_url,
      aspect_ratio,
      video_length,
      resolution_name,
      preset,
    }) => {
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

      console.log(
        `🎬 收到视频生成请求: Prompt="${prompt}", Image="${image_url || "N/A"}"`
      );

      try {
        // 构建消息内容
        let messageContent: string | Array<TextContent | ImageUrlContent>;

        if (image_url) {
          messageContent = [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image_url } },
          ];
        } else {
          messageContent = prompt;
        }

        const messages: ChatMessage[] = [
          {
            role: "user",
            content: messageContent,
          },
        ];

        // 构建视频配置
        const video_config: VideoConfig = {};
        if (aspect_ratio) video_config.aspect_ratio = aspect_ratio;
        if (video_length) video_config.video_length = video_length;
        if (resolution_name) video_config.resolution_name = resolution_name;
        if (preset) video_config.preset = preset;

        const requestBody: ChatCompletionRequest = {
          model: config.videoModel,
          messages: messages,
          stream: false,
          ...(Object.keys(video_config).length > 0 && { video_config }),
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

        const data = (await response.json()) as VideoGenerationResponse;
        let videoUrl = "";

        if (data.choices && data.choices[0]?.message?.content) {
          videoUrl = data.choices[0].message.content;
        }

        if (!videoUrl) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ API 返回成功，但未能提取到视频内容: ${JSON.stringify(data)}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `生成的视频信息: ${videoUrl}`,
            },
          ],
          structuredContent: {
            success: true,
            video: videoUrl,
          },
        };
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
