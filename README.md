# ☁️ MCP Cloud Media Generator

这是一个基于 **Model Context Protocol (MCP)** 的媒体生成服务器。

它作为一个中间件，将 MCP 协议请求转换为标准的 **OpenAI 兼容格式** (`/v1/chat/completions`) 调用上游 AI API。

该项目专为**云端部署**设计，通过 **Streamable HTTP** 提供服务，支持 MCP 客户端（如 Claude Desktop、RikkaHub）远程调用。

## ✨ 特性

- **TypeScript 重构**: 完整类型安全，使用 Zod 进行参数验证
- **Streamable HTTP**: MCP 官方推荐的新传输层，更稳定可靠
- **高级 MCP API**: 使用 `McpServer` + `registerTool` 模式
- **多工具支持**: 支持图像生成、图像编辑、视频生成
- **OpenAI 兼容**: 适配任何支持 `/v1/chat/completions` 的上游 API
- **CORS 支持**: 允许 RikkaHub 等 Web 客户端直接跨域连接
- **多端运行**: 支持 Docker、Zeabur、Railway、VPS、Android Termux

## 🛠️ 工具列表

### `generate_image`
根据文本描述生成图片。

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
根据一张图片和提示词进行编辑。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `image` | string | 是 | 基础图片的 URL（HTTP/HTTPS） | - |
| `prompt` | string | 是 | 描述你想如何修改图片 | - |
| `n` | integer | 否 | 生成数量 (1-4) | 1 |
| `size` | string | 否 | 尺寸：`256x256` `512x512` `1024x1024` | `1024x1024` |

### `generate_video`
根据文本描述或图片生成视频。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|---|---|---|---|---|
| `prompt` | string | 是 | 视频的详细描述提示词（建议英文） | - |
| `image_url` | string | 否 | 作为视频起点的图片 URL | - |

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
npm run build    # 编译 TypeScript
npm start        # 启动服务
npm run dev      # 开发模式（热重载）
npm run inspect  # MCP Inspector 测试
```

## ⚙️ 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `API_KEY` | **是** | - | 上游 API 密钥 |
| `API_BASE_URL` | 否 | `https://new-api.zonde306.site/v1` | 上游 API 地址 |
| `IMAGE_MODEL` | 否 | `grok-imagine-1.0` | 图像生成模型 |
| `EDIT_MODEL` | 否 | `grok-imagine-1.0-edit` | 图像编辑模型 |
| `VIDEO_MODEL` | 否 | `grok-imagine-1.0-video` | 视频生成模型 |
| `PORT` | 否 | `3000` | 服务端口 |

## 🔌 客户端连接

MCP 端点格式：`https://<your-domain>/mcp`

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

在客户端设置中填入 MCP 端点 URL 即可，已配置 CORS 支持浏览器访问。

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

## 🏗️ 技术栈

- **语言**: TypeScript 5.4+
- **运行时**: Node.js >= 18
- **Web 框架**: Express.js
- **MCP SDK**: @modelcontextprotocol/sdk ^1.0.0
- **参数验证**: Zod
- **传输层**: Streamable HTTP

## 📝 版本历史

- **v3.1.0** - 新增图像编辑和视频生成工具，统一使用 chat/completions 接口
- **v3.0.0** - TypeScript 重构，Streamable HTTP 传输层，Zod 参数验证
- **v2.0.x** - SSE 传输层，宽高比参数
- **v1.0.x** - 初始版本

## 📄 License

MIT
