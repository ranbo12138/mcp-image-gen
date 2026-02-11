# ☁️ MCP Cloud Image Generator

这是一个基于 **Model Context Protocol (MCP)** 的图像生成服务器。

它作为一个中间件，将 MCP 协议请求转换为标准的 **OpenAI 兼容格式** (`/v1/images/generations`) 图像生成 API 调用。

该项目专为**云端部署**（如 **ClawCloud**, Zeabur, Docker）设计，通过 **SSE (Server-Sent Events)** 提供服务，支持本地 MCP 客户端（如 RikkaHub, Claude Desktop）远程调用。

## ✨ 特性

- **标准 MCP 支持**: 完整实现 MCP 协议，支持 `CallTool` 和 `ListTools`。
- **SSE 传输层**: 专为云环境优化的 Server-Sent Events 通信（含心跳保活）。
- **OpenAI 兼容**: 适配任何支持 `/v1/images/generations` 的上游 API（如 Grok, DALL-E 等）。
- **CORS 支持**: 允许 RikkaHub 等 Web 客户端直接跨域连接。
- **多端运行**: 支持 Docker、VPS、Windows 云电脑以及 **Android Termux**。

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

### 📱 Termux (Android 手机) 部署 (推荐)

把旧手机变成 24 小时在线的 AI 生图服务器！

1. **安装环境**:
   ```bash
   pkg install git nodejs -y
   ```

2. **下载代码**:
   ```bash
   git clone https://github.com/ranbo12138/mcp-image-gen.git
   cd mcp-image-gen
   npm install
   ```

3. **配置**:
   ```bash
   cp .env.example .env
   nano .env
   # 在里面填入您的 API_KEY，按 Ctrl+O 保存，Ctrl+X 退出
   ```

4. **启动**:
   ```bash
   # 前台运行 (测试用)
   npm start
   
   # 或 后台运行 (推荐)
   npm install -g pm2
   pm2 start src/index.js --name mcp-server
   pm2 save
   ```

5. **公网访问 (可选)**:
   如果需要在外面连接手机，安装 Cloudflare Tunnel:
   ```bash
   pkg install cloudflared
   cloudflared tunnel --url http://localhost:3000
   ```

---

### ☁️ 部署到 ClawCloud (推荐云端)

本仓库配置了自动化 Workflow，Fork 后 GitHub 会自动构建 Docker 镜像。

1. **GitHub 设置**:
   - Fork 本仓库。
   - 在 GitHub 仓库 -> Packages -> Package settings -> Danger Zone -> Change visibility -> **Public**。

2. **ClawCloud 设置**:
   - **Image Name**: `ghcr.io/<您的用户名>/mcp-image-gen:latest`
   - **Environment Variables**:
     - `API_KEY`: `sk-xxxx`
     - `PORT`: `3000`

---

## ⚙️ 环境变量配置

| 变量名 (Key) | 必填 | 说明 |
|-------------|-----|------|
| `API_KEY` | **是** | 您的上游 API 密钥 |
| `API_BASE_URL` | 否 | 上游 API 地址 (默认已配好) |
| `IMAGE_MODEL` | 否 | 指定使用的生图模型 |
| `PORT` | 否 | 监听端口 (默认 3000) |

## 🔌 客户端连接

SSE 端点格式：
`http://<IP地址>:3000/sse`

- **局域网**: `http://192.168.x.x:3000/sse`
- **公网穿透**: `https://xxxx.trycloudflare.com/sse`
