/**
 * 统一类型定义模块
 * 集中管理所有共享的 TypeScript 接口和类型
 */

// ============================================================================
// API 响应类型
// ============================================================================

/** 图像生成 API 响应格式 */
export interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/** 图像编辑 API 响应格式 */
export interface ImageEditResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/** 视频生成 API 响应格式 */
export interface VideoGenerationResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// ============================================================================
// 统计类型
// ============================================================================

/** 工具调用统计 */
export interface ToolCallStats {
  generate_image: number;
  edit_image: number;
  generate_video: number;
}

/** 服务器统计信息 */
export interface Stats {
  startTime: number;
  totalRequests: number;
  toolCalls: ToolCallStats;
}

// ============================================================================
// MCP 相关类型
// ============================================================================

/** MCP 工具响应内容 */
export interface ToolContent {
  type: "text";
  text: string;
}

/** MCP 工具响应 */
export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

// ============================================================================
// 工具输出 Schema 类型（用于 structuredContent）
// ============================================================================

/** 图像生成输出 */
export interface ImageGenerationOutput {
  success: boolean;
  images: Array<{
    url: string;
  }>;
  error?: string;
}

/** 图像编辑输出 */
export interface ImageEditOutput {
  success: boolean;
  result: string;
  error?: string;
}

/** 视频生成输出 */
export interface VideoGenerationOutput {
  success: boolean;
  video: string;
  error?: string;
}

// ============================================================================
// API 请求类型
// ============================================================================

/** 消息内容类型 */
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageUrlContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type MessageContent = string | Array<TextContent | ImageUrlContent>;

/** 聊天消息 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

/** 视频配置 */
export interface VideoConfig {
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2";
  video_length?: "6" | "10" | "15";
  resolution_name?: "480p" | "720p";
  preset?: "fun" | "normal" | "spicy" | "custom";
}

/** 图像生成请求体 */
export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  n: number;
  size: string;
  response_format: "url" | "b64_json";
  stream: boolean;
}

/** 聊天完成请求体 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  video_config?: VideoConfig;
}
