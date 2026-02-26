/**
 * 配置管理模块
 * 统一管理环境变量和配置项
 */

import "dotenv/config";

export interface ServerConfig {
  port: number;
  apiBaseUrl: string;
  apiKey: string | undefined;
  imageModel: string;
  editModel: string;
  videoModel: string;
}

// 打印环境变量加载状态
console.log("🔧 环境变量加载状态:");
console.log(`   API_KEY: ${process.env.API_KEY ? `已设置 (${process.env.API_KEY.substring(0, 8)}...)` : "❌ 未设置"}`);
console.log(`   API_BASE_URL: ${process.env.API_BASE_URL || "使用默认值"}`);
console.log(`   IMAGE_MODEL: ${process.env.IMAGE_MODEL || "使用默认值"}`);
console.log(`   EDIT_MODEL: ${process.env.EDIT_MODEL || "使用默认值"}`);
console.log(`   VIDEO_MODEL: ${process.env.VIDEO_MODEL || "使用默认值"}`);
console.log(`   PORT: ${process.env.PORT || "使用默认值 3000"}`);

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  apiBaseUrl: process.env.API_BASE_URL || "https://new-api.zonde306.site/v1",
  apiKey: process.env.API_KEY,
  imageModel: process.env.IMAGE_MODEL || "grok-imagine-1.0",
  editModel: process.env.EDIT_MODEL || "grok-imagine-1.0",
  videoModel: process.env.VIDEO_MODEL || "grok-video-1.0",
};

// 检查必需配置
if (!config.apiKey) {
  console.warn("⚠️ 警告: 未检测到 API_KEY 环境变量。生成功能将无法工作。");
}
