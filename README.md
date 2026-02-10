# ☁️ MCP Cloud Image Generator

这是一个基于 **Model Context Protocol (MCP)** 的图像生成服务器。

它作为一个中间件，将 MCP 协议请求转换为标准的 **OpenAI 兼容格式** (`/v1/images/generations`) 图像生成 API 调用。

该项目专为**云端部署**（如 **ClawCloud**, Zeabur, Docker）设计，通过 **SSE (Server-Sent Events)** 提供服务，支持本地 MCP 客户端（如 Claude Desktop 配合连接器）远程调用。

## ✨ 特性

- **标准 MCP 支持**: 完整实现 MCP 协议，支持 `CallTool` 和 `ListTools`。
- **SSE 传输层**: 专为云环境优化的 Server-Sent Events 通信（含心跳保活）。
- **OpenAI 兼容**: 适配任何支持 `/v1/images/generations` 的上游 API（如 Grok, DALL-E 等）。
- **灵活返回格式**: 支持 `b64_json`（直接返回图片数据，推荐）和 `url` 模式。
- **自动化构建**: 内置 GitHub Actions，代码推送即自动构建 Docker 镜像到 GitHub Packages (ghcr.io)。

## 🛠️ 工具列表

### `generate_image`
根据文本描述生成图片。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `prompt` | string | 是 | 图片的详细描述提示词 | - |
| `n` | integer | 否 | 生成数量 (1-4) | 1 |
| `size` | string | 否 | 尺寸或比例 (如 `1024x1024`, `16:9`, `9:16`) | `1024x1024` |
| `response_format` | string | 否 | `b64_json` (直接返回图片) 或 `url` | `b64_json` |

## 🚀 部署指南

### 推荐: 部署到 ClawCloud (配合 GitHub Actions)

本仓库配置了自动化 Workflow，当你 Fork 并 Push 代码后，GitHub 会自动构建 Docker 镜像。

#### 1. 准备镜像
1. Fork 本仓库。
2. 确保 `.github/workflows/docker-publish.yml` 存在。
3. 提交任意更改到 `main` 分支，等待 GitHub Actions 跑完（约 1 分钟）。
4. 在 GitHub 仓库页面右侧边栏 -> **Packages** -> 点击生成的镜像。
5. **关键步骤**: 点击右侧 **Package settings** -> **Danger Zone** -> **Change package visibility** -> 设置为 **Public**。
   *(这是为了让 ClawCloud 能拉取你的镜像)*

#### 2. 部署服务
1. 登录 ClawCloud 控制台，创建新应用。
2. **Image**: 选择 `Public`。
3. **Image Name**: 填入你的镜像地址，格式为 `ghcr.io/<github用户名>/<仓库名>:latest`
   *(例如: `ghcr.io/ranbo12138/mcp-image-gen:latest`)*
4. **Usage**: 建议配置 0.5 vCPU / 256MB RAM。
5. **Network**:
   - Container Port: `3000` (**必须**)
   - Public Access: 开启
6. **Environment Variables** (点击 Add 添加):
   *(见下表)*

### 备选: 部署到 Zeabur
*(注: Zeabur 有时会出现节点 IP 耗尽问题，建议优先 ClawCloud)*
1. 在 Zeabur 创建服务，选择 GitHub 源代码部署。
2. 配置环境变量。
3. 服务会自动构建并启动。

## ⚙️ 环境变量配置

在部署平台 (ClawCloud/Zeabur) 中必须配置以下变量：

| 变量名 (Key) | 必填 | 示例值 (Value) | 说明 |
|-------------|-----|---------------|------|
| `API_KEY` | **是** | `sk-xxxxxxxx` | 你的上游 API 密钥 |
| `API_BASE_URL` | **推荐** | `https://new-api.zonde306.site/v1` | 上游 API 接口地址 |
| `IMAGE_MODEL` | **推荐** | `grok-imagine-1.0` | 指定使用的生图模型 |
| `PORT` | **是** | `3000` | 必须填 3000 |

## 🔌 客户端连接

服务启动后，SSE 端点位于：
`https://<你的域名>/sse`

### 在 Claude Desktop 中使用
(需配合本地桥接脚本，因为 Claude Desktop 暂不支持直接连接远程 SSE)

1. 在本地创建 `client.js`:
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 替换为你部署后的云端地址
const SERVER_URL = "https://<你的应用ID>.claw.cloud/sse";

async function main() {
  const transport = new SSEClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "proxy-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  // 这里需要实现将 client 的 tools 转发给 stdio 的逻辑
  // 推荐直接使用现成的 MCP Proxy 工具或等待官方支持
}
```

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
