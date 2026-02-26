import { z } from "zod";
import { config } from "../config.js";
/** 支持的图像宽高比 */
const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "2:3", "3:2"]).default("2:3");
/** generate_image 工具参数 Schema */
const GenerateImageSchema = {
    prompt: z.string().describe("图像的详细描述提示词（建议使用英文以获得最佳效果）"),
    n: z.number().min(1).max(4).default(1).describe("生成图片的数量（默认为 1）"),
    size: AspectRatioSchema.describe("图片宽高比：'16:9' (横屏)、'9:16' (竖屏)、'1:1' (正方形)、'2:3' (竖向，默认)、'3:2' (横向)"),
};
export function registerGenerateImageTool(server) {
    server.registerTool("generate_image", {
        title: "Generate Image",
        description: "调用云端 AI 模型生成图像。支持 5 种宽高比：16:9 (横屏)、9:16 (竖屏)、1:1 (正方形)、2:3 (竖向)、3:2 (横向)。",
        inputSchema: GenerateImageSchema,
    }, async ({ prompt, n, size }) => {
        if (!config.apiKey) {
            return {
                content: [
                    {
                        type: "text",
                        text: "❌ 服务端未配置 API Key，无法生成图像。请设置 API_KEY 环境变量。",
                    },
                ],
                isError: true,
            };
        }
        console.log(`🎨 收到生图请求: "${prompt}" [Ratio: ${size}, N: ${n}]`);
        try {
            const requestBody = {
                model: config.imageModel,
                prompt,
                n,
                size,
                response_format: "url",
                stream: false,
            };
            const response = await fetch(`${config.apiBaseUrl}/images/generations`, {
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
                            type: "text",
                            text: `❌ API 请求失败: ${response.status} - ${errorText}`,
                        },
                    ],
                    isError: true,
                };
            }
            const data = (await response.json());
            const content = [];
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
                return {
                    content: [
                        {
                            type: "text",
                            text: "❌ API 返回的数据为空或格式无法解析",
                        },
                    ],
                    isError: true,
                };
            }
            return { content };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("执行出错:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ 图像生成失败: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=generate_image.js.map