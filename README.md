# ☁️ MCP Cloud Image Generator

这是一个基于 **Model Context Protocol (MCP)** 的图像生成服务器。

它作为一个中间件，将 MCP 协议请求转换为标准的 **OpenAI 兼容格式** (`/v1/images/generations`) 图像生成 API 调用。

该项目专为**云端部署**（如 Zeabur, Docker）设计，通过 **SSE (Server-Sent Events)** 提供服务，支持本地 MCP 客户端（如 Claude Desktop 配合连接器）远程调用。

## ✨ 特性

- **标准 MCP 支持**: 完整实现 MCP 协议，支持 `CallTool` 和 `ListTools`。
- **SSE 传输层**: 专为云环境优化的 Server-Sent Events 通信。
- **OpenAI 兼容**: 适配任何支持 `/v1/images/generations` 的上游 API（如 Grok, DALL-E 等）。
- **灵活返回格式**: 支持 `b64_json`（直接返回图片数据，推荐）和 `url` 模式。
- **自定义尺寸**: 支持直接透传尺寸或比例字符串（如 `16:9`, `1024x1024`）。
- **Docker Ready**: 内置 Dockerfile，一键部署到 Zeabur 或其他容器平台。

## 🛠️ 工具列表

### `generate_image`
根据文本描述生成图片。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|Data | Data | Data | Data | Data |
| `prompt` | string | 是 | 图片的详细描述提示词 | - |
| `n` | integer | 否 | 生成数量 (1-4) | 1 |
| `size` | string | 否 | 尺寸或比例 (如 `1024x1024`, `16:9`, `9:16`) | `1024x1024` |
| `response_format` | string | 否 | `b64_json` (直接返回图片) 或 `url` | `b64_json` |

## 🚀 部署指南

### 选项 1: 部署到 Zeabur (推荐)

1. Fork 或上传此代码仓库到 GitHub。
2. 在 Zeabur 创建新服务，选择源代码部署。
3. Zeabur 会自动识别 Dockerfile 并开始构建。
4. **重要**: 在 Zeabur 的 "Variables" (环境变量) 面板中添加以下配置。
5. 获取公网域名，例如 `https://your-service.zeabur.app`。

### 选项 2: Docker 手动运行

```bash
# 构建镜像
docker build -t mcp-image-gen .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e API_KEY="sk-xxxx" \
  mcp-image-gen
```

## ⚙️ 环境变量配置

| 变量名 | 必填 | 说明 | 默认值 |
|-------|-----|------|-------|
| `API_KEY` | **是** | 上游 API 的密钥 (Bearer Token) | - |
| `API_BASE_URL` | 否 | 上游 API 基础路径 | `https://new-api.zonde306.site/v1` |
| `IMAGE_MODEL` | 否 | 使用的模型名称 | `grok-imagine-1.0` |
| `PORT` | 否 | 服务监听端口 | `3000` |

## 🔌 客户端连接

服务启动后，SSE 端点位于：
`https://<你的域名>/sse`

### 在 Claude Desktop 中使用

由于 Claude Desktop 目前主要支持本地进程调用，你需要一个本地的 "桥接器" 来连接远程 SSE 服务。

你可以在本地创建一个简单的 `connector.js`:

```javascript
// npm install @modelcontextprotocol/sdk eventsource
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 替换为你的云端地址
const SERVER_URL = "https://your-project.zeabur.app/sse";

async function main() {
  const transport = new SSEClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "proxy-client", version: "1.0.0" }, { capabilities: {} });
  
  await client.connect(transport);
  
  // 将远程能力转发给本地 StdIO (供 Claude Desktop 使用)
  // ... (需要实现完整的转发逻辑，或等待 Claude Desktop 原生支持 SSE URL)
}
```

*注：目前最简单的调试方法是使用支持 SSE 的 MCP 调试工具，或者等待 Claude Desktop 正式版对 Remote SSE 的原生支持。*

## 🧑‍💻 本地开发

```bash
# 安装依赖
npm install

# 创建 .env 文件
cp .env.example .env
# 编辑 .env 填入你的 API_KEY

# 启动开发服务器
npm run dev
```
