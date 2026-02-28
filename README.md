# ☁️ MCP Cloud Media Generator (v3.1.1)

这是一个基于 **Model Context Protocol (MCP)** 的媒体生成服务器。
它作为一个强大的中间件，将 MCP 协议请求无缝转换为标准的 **OpenAI 兼容格式**，从而调用上游 AI API 进行图像与视频的生成及编辑。

> 💡 **接口调用说明**：本项目在底层智能路由了两种不同的上游接口格式：
> - `POST /v1/images/generations`: 专用于图像生成（文生图）
> - `POST /v1/chat/completions`: 统一用于图像编辑、视频生成（图/文生视频）

本项目专为**云端部署**设计，底层采用 **Streamable HTTP** 提供服务，完美支持各类 MCP 客户端（如 Claude Desktop、RikkaHub 等）进行远程跨域调用。

---

## ✨ 核心特性

- 🛡️ **TypeScript 重构**: 提供完整的类型安全，使用 Zod 进行严格的输入参数验证。
- ⚡ **Streamable HTTP**: 采用 MCP 官方推荐的新一代传输层，长连接更稳定可靠。
- 🧩 **多源图片格式兼容**: **[New]** 智能解析输入的图片参数，原生支持 `HTTP/HTTPS` 链接、OpenAI `image_url` 对象以及 **Gemini 独有的 `inline_data` (Base64) 格式**。
- 🛠️ **多模态工具矩阵**: 集成图像生成、图像编辑、视频生成三大核心能力。
- 🌐 **CORS 友好**: 内置跨域支持，允许 RikkaHub 等 Web 端 AI 平台直接连接。
- 📦 **全平台部署**: 完美适配 Docker、Zeabur、Railway、VPS，甚至支持 Android Termux 手机端运行。

---

## 🛠️ 工具列表与参数说明

### 1. `generate_image` (图像生成)
根据文本描述生成全新的图片。
*🔗 上游接口: `POST /v1/images/generations`*

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|:---|:---|:---:|:---|:---|
| `prompt` | string | **是** | - | 图片的详细描述提示词（建议使用英文以获得更好效果）。 |
| `n` | integer | 否 | `1` | 生成的图片数量，范围 (1-4)。 |
| `size` | string | 否 | `2:3` | 图片宽高比。支持：<br>`16:9` (横屏/视频封面)<br>`9:16` (竖屏/手机壁纸)<br>`1:1` (正方形/头像)<br>`2:3` (竖向人像摄影)<br>`3:2` (横向风景摄影) |

### 2. `edit_image` (图像编辑)
提供一张参考图和提示词，AI 将对原图进行重绘或修改。
*🔗 上游接口: `POST /v1/chat/completions`*

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|:---|:---|:---:|:---|:---|
| `image` | string/object | **是** | - | 基础图片的 URL。**支持 HTTP/HTTPS 链接，同时也支持大模型传入的 Base64 格式 (包括 Gemini 的 `inline_data` 对象)。** |
| `prompt` | string | **是** | - | 详细描述你想如何修改这张图片。 |
| `n` | integer | 否 | `1` | 生成数量，范围 (1-4)。 |
| `size` | string | 否 | `1024x1024` | 输出尺寸：`256x256`, `512x512`, `1024x1024`。 |

### 3. `generate_video` (视频生成)
调用 AI 模型，将静态图片（或纯文本）转换为短视频。
*🔗 上游接口: `POST /v1/chat/completions`*

> ⚠️ **强烈建议**：目前的视频生成模型对于“纯文本生成视频”效果有限，**调用此工具时请务必提供 `image_url` (基础图片) 以获得最佳的图生视频效果**。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|:---|:---|:---:|:---|:---|
| `prompt` | string | **是** | - | 视频的详细描述提示词（建议英文）。 |
| `image_url`| string/object | 否 | - | 作为视频生成起点的静态图片。**支持常规网页链接及 Base64 对象格式。** |
| `aspect_ratio`| string | 否 | 自动 | 视频宽高比：`16:9`, `9:16`, `1:1`, `2:3`, `3:2`。 |
| `video_length`| string | 否 | 自动 | 视频时长(秒)：`6`, `10`, `15`。 |
| `resolution_name`| string | 否 | 自动 | 输出分辨率：`480p`, `720p`。 |
| `preset` | string | 否 | 自动 | 风格预设：`fun`, `normal`, `spicy`, `custom`。 |

---

## 🚀 部署指南

### ☁️ 云平台一键部署 (推荐 Zeabur / Railway)
1. **Fork 本仓库** 到你的 GitHub。
2. 在目标云平台（Zeabur/Railway）导入该仓库。
3. **配置环境变量**（详见下文）。
4. 点击部署，获得公网调用地址（如 `https://your-app.zeabur.app/mcp`）。

### 🐳 Docker 部署
```bash
# 使用 GitHub Container Registry 直接运行
docker run -d -p 3000:3000 \
  -e API_KEY=sk-xxxx \
  ghcr.io/ranbo12138/mcp-image-gen:latest

# 或克隆源码进行本地构建
git clone https://github.com/ranbo12138/mcp-image-gen.git
cd mcp-image-gen
docker build -t mcp-image-gen .
docker run -d -p 3000:3000 -e API_KEY=sk-xxxx mcp-image-gen
```

### 📱 Android Termux 部署
在手机上也能跑 MCP Server！
```bash
pkg install git nodejs nano -y
git clone https://github.com/ranbo12138/mcp-image-gen.git
cd mcp-image-gen
npm install
npm run build

# 配置环境变量
cp .env.example .env
nano .env  # 填入你的 API_KEY 等信息

# 启动服务 (推荐安装 pm2 进行后台保活)
npm start
```

---

## ⚙️ 环境变量配置

在项目根目录创建 `.env` 文件或在云平台设置面板中配置：

| 变量名 | 是否必填 | 默认值 | 说明 |
|:---|:---:|:---|:---|
| `API_KEY` | **必填** | - | 上游大模型的 API 密钥 (`sk-...`) |
| `API_BASE_URL` | 选填 | `https://api.example.com/v1` | 上游接口的基础地址 (⚠️ 必须包含 `/v1` 尾缀) |
| `IMAGE_MODEL` | 选填 | `grok-imagine-1.0` | 图像生成调用的模型名 |
| `EDIT_MODEL` | 选填 | `grok-imagine-1.0-edit` | 图像编辑调用的模型名 |
| `VIDEO_MODEL` | 选填 | `grok-imagine-1.0-video` | 视频生成调用的模型名 |
| `PORT` | 选填 | `3000` | 服务监听的本地端口 |

---

## 🔌 客户端接入指南

### 🤖 Claude Desktop
编辑 Claude 的配置文件 `~/Library/Application Support/Claude/claude_desktop_config.json`：
```json
{
  "mcpServers": {
    "cloud-media-generator": {
      "url": "https://你的域名或IP/mcp"
    }
  }
}
```

### 🌐 RikkaHub 等 Web 客户端
在客户端的“添加 MCP 服务器”设置中：
1. **连接类型/传输方式 (Transport)**：必须选择 **`Streamable HTTP`** (或 SSE)。
2. **端点 URL**：填入您的服务地址，例如 `https://你的域名/mcp`。

---

## 📊 服务端点监控

| 接口路径 | HTTP 方法 | 功能说明 |
|:---|:---:|:---|
| `/mcp` | POST | MCP 协议主通讯端点 (接受指令) |
| `/mcp` | GET | SSE 消息流推送端点 (保持长连接) |
| `/health` | GET | 基础健康检查 |
| `/status` | GET | 📡 **服务监控面板** (支持浏览器访问查看状态) |

---

## 📝 版本历史

- **v3.1.1** - 优化图片解析逻辑，底层兼容 OpenAI `image_url` 及 Gemini 的 Base64 `inline_data` 格式，大幅提升多模型协作成功率。
- **v3.1.0** - 新增 `edit_image` 和 `generate_video` 工具，全面分离 `/images/generations` 与 `/chat/completions` 接口规范。
- **v3.0.0** - 彻底使用 TypeScript 重构，引入 Streamable HTTP 传输层与 Zod 参数验证机制。
- **v2.0.x** - 引入 SSE 传输层，新增图像宽高比自定义参数。
- **v1.0.x** - 项目初代版本。

---

## 💡 特别说明与致谢

本项目最初基于 [**grok2api**](https://github.com/zonde306/grok2api) 渠道进行了深度的联调与验证

如果您在接入其他上游模型（如 OpenAI / Midjourney API 代理等）时遇到兼容性问题，欢迎提交 Issue 反馈！

## 📄 License
基于 **MIT License** 开源。