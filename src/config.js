import "dotenv/config";

export const CONFIG = {
  // 服务器配置
  PORT: process.env.PORT || 3000,
  
  // 上游 API 配置
  API_BASE_URL: process.env.API_BASE_URL || "https://new-api.zonde306.site/v1",
  API_KEY: process.env.API_KEY, // 必需
  
  // 图像生成默认参数
  DEFAULT_MODEL: process.env.IMAGE_MODEL || "grok-imagine-1.0",
  DEFAULT_SIZE: "1024x1024",
};

// 检查必需的环境变量
if (!CONFIG.API_KEY) {
  console.warn("⚠️ 警告: 未检测到 API_KEY 环境变量。图像生成功能将无法工作。");
}
