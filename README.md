# ☁️ MCP Cloud Media Generator (v3.1.0)

这是一个基于 **Model Context Protocol (MCP)** 的媒体生成服务器。
它作为一个中间件，将 MCP 协议请求转换为标准的 **OpenAI 兼容格式** 调用上游 AI API。

💡 **接口调用说明**：本项目实际上使用了两种不同的上游接口格式：
- `POST /v1/images/generations`: 专用于图像生成（文生图）
- `POST /v1/chat/completions`: 统一用于图像编辑、视频生成（图生视频）

该项目专为**云端部署**设计，通过 **Streamable HTTP** 提供服务，支持 MCP 客户端（如 Claude Desktop、RikkaHub 等）远程调用。

## ✨ 特性
- **TypeScript 重构**: 完整类型安全，使用 Zod 进行参数验证
- **Streamable HTTP**: MCP 官方推荐的新传输层，更稳定可靠
- **高级 MCP API**: 使用 `McpServer` + `registerTool` 模式
- **多工具支持**: 支持图像生成、图像编辑、视频生成
- **OpenAI 兼容**: 适配任何支持对应端点的上游 API
- **CORS 支持**: 允许 RikkaHub 等 Web 客户端直接跨域连接
- **多端运行**: 支持 Docker、Zeabur、Railway、VPS、Android Termux

## 🛠️ 工具列表

### `generate_image`
根据文本描述生成图片。
**上游接口**: `POST /v1/images/generations`

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `prompt` | string | 是 | 图片的详细描述提示词（建议英文） | - |
| `n` | integer | 否 | 生成数量 (1-4) | 1 |
| `size` | string | 否 | 宽高比：`16:9` `9:16` `1:1` `2:3` `3:2` | `2:3` |

**宽高比说明：**
- `16:9` - 横屏（视频封面、横幅）
- `9:16` - 竖屏（手机壁纸、短视频）
- `1:1` - 正方形（社交媒体头像）
- `2:3` - 竖向（人像摄影，默认）
- `3:2` - 横向（风景摄影）

### `edit_image`
根据一张图片和提示词进行编辑修改。
**上游接口**: `POST /v1/chat/completions`

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `image` | string | 是 | 基础图片的 URL（仅支持 HTTP/HTTPS） | - |
| `prompt` | string | 是 | 描述你想如何修改图片 | - |
| `n` | integer | 否 | 生成数量 (1-4) | 1 |
| `size` | string | 否 | 尺寸：`256x256` `512x512` `1024x1024` | `1024x1024` |

### `generate_video`
调用 AI 模型，将静态图片转换为短视频。
**上游接口**: `POST /v1/chat/completions`

> ⚠️ **注意**：目前的视频生成工具**不支持纯文本生成视频（文生视频），仅支持图生视频**。调用时必须确保有可用的基础图片。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `prompt` | string | 是 | 视频的详细描述提示词（建议英文） | - |
| `image_url` | string | 否 | 作为视频生成起点的静态图片 URL (实际使用中强烈建议提供) | - |
| `aspect_ratio` | string | 否 | 视频宽高比：`16:9` `9:16` `1:1` `2:3` `3:2` | AI 自动判断 |
| `video_length` | string | 否 | 视频时长(秒)：`6` `10` `15` | AI 自动判断 |
| `resolution_name` | string | 否 | 分辨率：`480p` `720p` | AI 自动判断 |
| `preset` | string | 否 | 风格预设：`fun` `normal` `spicy` `custom` | AI 自动判断 |

## 🚀 部署指南

### ☁️ 部署到 Zeabur / Railway (推荐)
1. **Fork 本仓库**
2. **在 Zeabur/Railway 导入仓库**
3. **配置环境变量**:
   - `API_KEY`: `sk-xxxx` (必需)
   - `API_BASE_URL`: 上游 API 地址 (可选)
4. **部署完成**，获得公网地址

### 🐳 Docker 部署
```bash
# 使用 GitHub Container Registry
docker run -d -p 3000:3000 \
  -e API_KEY=sk-xxxx \
  ghcr.io/ranbo12138/mcp-image-gen:latest

# 或本地构建
git clone https://github.com/ranbo12138/mcp-image-gen.git
cd mcp-image-gen
docker build -t mcp-image-gen .
docker run -d -p 3000:3000 -e API_KEY=sk-xxxx mcp-image-gen
```

### 📱 Termux (Android) 部署
```bash
# 安装依赖
pkg install git nodejs -y
# 克隆项目
git clone https://github.com/ranbo12138/mcp-image-gen.git
cd mcp-image-gen
npm install
# 构建 TypeScript
npm run build
# 配置环境变量
cp .env.example .env
nano .env  # 填入 API_KEY
# 启动服务
npm start
# 或使用 pm2 后台运行
npm install -g pm2
pm2 start dist/index.js --name mcp-server
pm2 save
```

### 🔧 本地开发
```bash
npm install
npm run build        # 编译 TypeScript
npm start            # 启动服务
npm run dev          # 开发模式（热重载）
npm run inspect      # MCP Inspector 测试
```

## ⚙️ 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `API_KEY` | **是** | - | 上游 API 密钥 |
| `API_BASE_URL` | 否 | `https://api.example.com/v1` | 上游 API 地址（需包含 /v1 后缀） |
| `IMAGE_MODEL` | 否 | `grok-imagine-1.0` | 图像生成模型 |
| `EDIT_MODEL` | 否 | `grok-imagine-1.0-edit` | 图像编辑模型 |
| `VIDEO_MODEL` | 否 | `grok-imagine-1.0-video` | 视频生成模型 |
| `PORT` | 否 | `3000` | 服务端口 |

## 🔌 客户端连接

### Claude Desktop
编辑配置文件 `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "media-generator": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

### RikkaHub / Web 客户端
在客户端的连接设置中，请按照以下方式配置：
1. **连接类型/传输方式 (Transport)**：必须选择 **Streamable HTTP** (或基于 SSE 的 HTTP 选项)。
2. **端点 URL**：填入您的服务地址，例如：`https://your-domain.com/mcp` 或 `http://你的IP或域名/mcp`。

*注：项目已内置配置 CORS，支持浏览器 Web 客户端直接跨域连接。*

### curl 测试
```bash
# 初始化连接
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
# 记录返回的 mcp-session-id
```

## 📊 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mcp` | POST | MCP 协议主端点 |
| `/mcp` | GET | SSE 通知（服务器推送） |
| `/mcp` | DELETE | 会话终止 |
| `/health` | GET | 健康检查 |
| `/status` | GET | 监控面板（JSON/HTML） |

## 🏗️ 技术栈
- **语言**: TypeScript 5.4+
- **运行时**: Node.js >= 18
- **Web 框架**: Express.js
- **MCP SDK**: @modelcontextprotocol/sdk ^1.0.0
- **参数验证**: Zod
- **传输层**: Streamable HTTP

## 📝 版本历史
- **v3.1.0 (Current)** - 新增图像编辑和图生视频工具，全面分离 `/images/generations` 与 `/chat/completions` 接口规范。
- **v3.0.0** - TypeScript 重构，Streamable HTTP 传输层，Zod 参数验证。
- **v2.0.x** - SSE 传输层，新增宽高比参数。
- **v1.0.x** - 初始版本。

## 💡 特别说明与致谢
本项目最初仅在基于 [**grok2api**](https://github.com/zonde306/grok2api) 项目的渠道上进行了充分的测试与验证。如果您在接入其他上游模型渠道时遇到兼容性问题，欢迎提交 Issue 反馈！

## 📄 License
MIT